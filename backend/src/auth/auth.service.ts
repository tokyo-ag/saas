import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await this.prisma.tenant.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('コード生成に失敗しました');
  }

  private issueToken(
    tenantId: string,
    accountId: string,
    isSuperadmin = false,
  ): string {
    return this.jwtService.sign({
      tenantId,
      accountId,
      ...(isSuperadmin && { isSuperadmin: true }),
    });
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateSixDigitCode(): string {
    return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return email;
    return `${user.slice(0, 1)}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
  }

  private isSuperadminAccount(email: string | null): boolean {
    const superadminEmail = this.config.get<string>('SUPERADMIN_EMAIL');
    return !!superadminEmail && email === superadminEmail;
  }

  // ログインの第1段階（パスワード確認）を通過したアカウントへ確認コードを
  // メールで送り、本人確認が済むまでは実際のセッションを発行しない。
  // スーパーアドミンも含め、主催者は全員メールでコードを受け取る。
  private async issuePendingTwoFactor(account: {
    id: string;
    tenantId: string;
    email: string | null;
  }): Promise<{ pendingToken: string; maskedDestination: string }> {
    const code = this.generateSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: {
        twoFactorCodeHash: codeHash,
        twoFactorCodeExpiresAt: expiresAt,
        twoFactorAttempts: 0,
      },
    });

    await this.email
      .sendTwoFactorCodeEmail(account.email!, code)
      .catch((err) => {
        this.logger.error(
          `Failed to send 2FA code to ${account.email}: ${err?.message ?? err}`,
        );
      });

    const pendingToken = this.jwtService.sign(
      {
        accountId: account.id,
        tenantId: account.tenantId,
        purpose: 'pending-2fa',
      },
      { expiresIn: '10m' },
    );
    return { pendingToken, maskedDestination: this.maskEmail(account.email!) };
  }

  private verifyPendingTwoFactorToken(pendingToken: string): {
    accountId: string;
    tenantId: string;
  } {
    let payload: { accountId: string; tenantId: string; purpose: string };
    try {
      payload = this.jwtService.verify(pendingToken);
    } catch {
      throw new UnauthorizedException(
        'セッションの有効期限が切れました。もう一度ログインしてください。',
      );
    }
    if (payload.purpose !== 'pending-2fa') {
      throw new UnauthorizedException('無効なリクエストです');
    }
    return { accountId: payload.accountId, tenantId: payload.tenantId };
  }

  async register(email: string, password: string, orgName: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      return {
        message:
          '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。',
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.pendingRegistration.deleteMany({
      where: { email: normalizedEmail },
    });
    await this.prisma.pendingRegistration.create({
      data: { token, email: normalizedEmail, passwordHash, orgName, expiresAt },
    });

    await this.email
      .sendVerificationEmail(normalizedEmail, token)
      .catch((err) => {
        this.logger.error(
          `Failed to send verification email to ${normalizedEmail}: ${err?.message ?? err}`,
        );
      });

    return {
      message:
        '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。',
    };
  }

  async login(email: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const account = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    });
    // Always run bcrypt to prevent timing-based email enumeration
    const DUMMY_HASH =
      '$2b$10$m3uTNheJt3kDmW/E0lwjcOKRYLI0JIGwJ5e5Youmc7jUPbPETHUwu';
    const valid = await bcrypt.compare(
      password,
      account?.passwordHash ?? DUMMY_HASH,
    );
    if (!account?.passwordHash || !valid)
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    if (!account.emailVerifiedAt)
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');

    return this.issuePendingTwoFactor(account);
  }

  async verifyTwoFactor(pendingToken: string, code: string) {
    const { accountId, tenantId } =
      this.verifyPendingTwoFactorToken(pendingToken);

    const account = await this.prisma.organizerAccount.findUnique({
      where: { id: accountId },
    });
    if (
      !account ||
      account.tenantId !== tenantId ||
      !account.twoFactorCodeHash ||
      !account.twoFactorCodeExpiresAt
    ) {
      throw new UnauthorizedException('もう一度ログインしてください');
    }
    if (account.twoFactorCodeExpiresAt < new Date()) {
      throw new UnauthorizedException(
        '確認コードの有効期限が切れました。もう一度ログインしてください。',
      );
    }
    if (account.twoFactorAttempts >= 5) {
      await this.prisma.organizerAccount.update({
        where: { id: account.id },
        data: {
          twoFactorCodeHash: null,
          twoFactorCodeExpiresAt: null,
          twoFactorAttempts: 0,
        },
      });
      throw new UnauthorizedException(
        '試行回数が上限に達しました。もう一度ログインしてください。',
      );
    }

    const validCode = await bcrypt.compare(code, account.twoFactorCodeHash);
    if (!validCode) {
      await this.prisma.organizerAccount.update({
        where: { id: account.id },
        data: { twoFactorAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException('確認コードが正しくありません');
    }

    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: {
        twoFactorCodeHash: null,
        twoFactorCodeExpiresAt: null,
        twoFactorAttempts: 0,
      },
    });

    const isSuperadmin = this.isSuperadminAccount(account.email);
    return {
      token: this.issueToken(account.tenantId, account.id, isSuperadmin),
      tenantId: account.tenantId,
      emailVerified: true,
    };
  }

  async resendTwoFactor(pendingToken: string) {
    const { accountId, tenantId } =
      this.verifyPendingTwoFactorToken(pendingToken);
    const account = await this.prisma.organizerAccount.findUnique({
      where: { id: accountId },
    });
    if (!account || account.tenantId !== tenantId) {
      throw new UnauthorizedException('もう一度ログインしてください');
    }
    return this.issuePendingTwoFactor(account);
  }

  async reconfirmPassword(
    tenantId: string,
    accountId: string,
    email: string,
    password: string,
  ): Promise<{ reauthToken: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const account = await this.prisma.organizerAccount.findUnique({
      where: { id: accountId },
    });
    if (
      !account ||
      account.tenantId !== tenantId ||
      !account.email ||
      account.email.toLowerCase() !== trimmedEmail ||
      !account.passwordHash
    ) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid)
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    return {
      reauthToken: this.jwtService.sign(
        { tenantId, accountId, purpose: 'sensitive-settings' },
        { expiresIn: '10m' },
      ),
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // 仮登録からの確認（新規登録フロー）
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { token },
    });
    if (pending) {
      if (pending.expiresAt < new Date()) {
        await this.prisma.pendingRegistration.delete({ where: { token } });
        throw new BadRequestException(
          'リンクの有効期限が切れています。もう一度登録してください。',
        );
      }
      const existingAccount = await this.prisma.organizerAccount.findFirst({
        where: { email: { equals: pending.email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existingAccount) {
        await this.prisma.pendingRegistration.delete({ where: { token } });
        throw new ConflictException('このメールアドレスは既に登録されています');
      }
      const code = await this.generateUniqueCode();
      await this.prisma.tenant.create({
        data: {
          id: `tenant-${Date.now()}`,
          name: pending.orgName,
          code,
          organizerAccounts: {
            create: {
              email: pending.email,
              passwordHash: pending.passwordHash,
              emailVerifiedAt: new Date(),
            },
          },
        },
      });
      await this.prisma.pendingRegistration.delete({ where: { token } });
      return {
        message: 'メールアドレスを確認しました。ログインしてください。',
      };
    }

    // setEmailPassword フロー（LINE登録ユーザーのメール追加）
    const account = await this.prisma.organizerAccount.findUnique({
      where: { emailVerificationToken: token },
    });
    if (!account)
      throw new BadRequestException('無効または期限切れのリンクです');
    if (account.emailVerifiedAt) return { message: '既に確認済みです' };

    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: { emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
    return { message: 'メールアドレスを確認しました' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const account = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    });

    // セキュリティのため、アカウントが存在しない場合も同じレスポンスを返す
    if (!account?.passwordHash) {
      return {
        message:
          'パスワードリセットメールを送信しました（メールアドレスが登録されている場合）',
      };
    }

    const resetToken = this.generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間

    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    await this.email
      .sendPasswordResetEmail(account.email!, resetToken)
      .catch(() => null);

    return {
      message:
        'パスワードリセットメールを送信しました（メールアドレスが登録されている場合）',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const account = await this.prisma.organizerAccount.findUnique({
      where: { passwordResetToken: token },
    });
    if (!account || !account.passwordResetExpiresAt) {
      throw new BadRequestException('無効または期限切れのリンクです');
    }
    if (account.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException(
        'リンクの有効期限が切れています。もう一度やり直してください。',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });
    return { message: 'パスワードをリセットしました' };
  }

  async setEmailPassword(
    tenantId: string,
    accountId: string,
    email: string,
    password: string,
  ): Promise<{ message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const account = await this.prisma.organizerAccount.findUnique({
      where: { id: accountId },
    });
    if (!account || account.tenantId !== tenantId)
      throw new UnauthorizedException();
    if (account.passwordHash)
      throw new BadRequestException('既にパスワードが設定されています');

    const existing = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = this.generateToken();
    await this.prisma.organizerAccount.update({
      where: { id: accountId },
      data: {
        email: trimmedEmail,
        passwordHash,
        emailVerificationToken: verificationToken,
      },
    });
    await this.email
      .sendVerificationEmail(trimmedEmail, verificationToken)
      .catch(() => null);
    return { message: 'メールアドレスとパスワードを設定しました' };
  }

  async resendVerificationEmail(
    tenantId: string,
    accountId: string,
  ): Promise<{ message: string }> {
    const account = await this.prisma.organizerAccount.findUnique({
      where: { id: accountId },
    });
    if (!account?.email)
      throw new BadRequestException('メールアドレスが設定されていません');
    if (account.emailVerifiedAt) return { message: '既に確認済みです' };

    const token = this.generateToken();
    await this.prisma.organizerAccount.update({
      where: { id: accountId },
      data: { emailVerificationToken: token },
    });
    await this.email
      .sendVerificationEmail(account.email, token)
      .catch((err) => {
        this.logger.error(
          `Failed to resend verification email to ${account.email}: ${err?.message ?? err}`,
        );
      });
    return { message: '確認メールを再送しました' };
  }

  async resendVerificationEmailByEmail(
    email: string,
  ): Promise<{ message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const msg = { message: '確認メールを送信しました（登録済みの場合）' };

    // 仮登録フロー（新規登録ユーザー）
    const pending = await this.prisma.pendingRegistration.findFirst({
      where: { email: trimmedEmail },
    });
    if (pending) {
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.prisma.pendingRegistration.delete({
        where: { token: pending.token },
      });
      await this.prisma.pendingRegistration.create({
        data: {
          token,
          email: trimmedEmail,
          passwordHash: pending.passwordHash,
          orgName: pending.orgName,
          expiresAt,
        },
      });
      await this.email
        .sendVerificationEmail(trimmedEmail, token)
        .catch((err) => {
          this.logger.error(
            `Failed to resend verification email to ${trimmedEmail}: ${err?.message ?? err}`,
          );
        });
      return msg;
    }

    // setEmailPassword フロー（LINE登録ユーザーのメール追加）
    const account = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    });
    if (!account?.email || account.emailVerifiedAt) return msg;

    const token = this.generateToken();
    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: { emailVerificationToken: token },
    });
    await this.email
      .sendVerificationEmail(account.email, token)
      .catch((err) => {
        this.logger.error(
          `Failed to resend verification email to ${account.email}: ${err?.message ?? err}`,
        );
      });
    return msg;
  }

  async getMe(tenantId: string, accountId: string) {
    const account = await this.prisma.organizerAccount.findUnique({
      where: { id: accountId, tenantId },
    });
    return {
      tenantId,
      accountId,
      lineUserId: account?.lineUserId,
      email: account?.email,
      emailVerified: !!account?.emailVerifiedAt,
      hasPassword: !!account?.passwordHash,
    };
  }
}
