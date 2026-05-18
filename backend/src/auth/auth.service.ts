import { Injectable, ConflictException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
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

  private issueToken(tenantId: string, accountId: string, isSuperadmin = false): string {
    return this.jwtService.sign({ tenantId, accountId, ...(isSuperadmin && { isSuperadmin: true }) });
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  getLineAuthUrl(): string {
    const channelId = this.config.get<string>('LINE_LOGIN_CHANNEL_ID');
    if (!channelId) throw new BadRequestException('LINE Login未設定');
    const backendUrl = this.config.get<string>('BACKEND_URL') ?? 'http://localhost:3001';
    const state = this.jwtService.sign({ ts: Date.now() }, { expiresIn: '10m' });
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: `${backendUrl}/api/auth/line/callback`,
      state,
      scope: 'profile openid',
    });
    return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
  }

  async handleLineCallback(code: string, state: string): Promise<{ redirectUrl: string }> {
    const channelId = this.config.get<string>('LINE_LOGIN_CHANNEL_ID') ?? '';
    const channelSecret = this.config.get<string>('LINE_LOGIN_CHANNEL_SECRET') ?? '';
    const backendUrl = this.config.get<string>('BACKEND_URL') ?? 'http://localhost:3001';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    try { this.jwtService.verify(state); } catch {
      throw new BadRequestException('Invalid state');
    }

    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${backendUrl}/api/auth/line/callback`,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token: string };

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as { userId: string; displayName: string };

    const account = await this.prisma.organizerAccount.findUnique({
      where: { lineUserId: profile.userId },
    });

    if (account) {
      const token = this.issueToken(account.tenantId, account.id);
      return { redirectUrl: `${frontendUrl}/auth/callback?token=${token}` };
    }

    const lineToken = this.jwtService.sign(
      { lineUserId: profile.userId, displayName: profile.displayName },
      { expiresIn: '30m' },
    );
    return { redirectUrl: `${frontendUrl}/register/line?lineToken=${encodeURIComponent(lineToken)}` };
  }

  async completeLineRegistration(lineToken: string, orgName: string) {
    let payload: { lineUserId: string; displayName: string };
    try {
      payload = this.jwtService.verify(lineToken);
    } catch {
      throw new BadRequestException('セッションが切れました。もう一度LINEでログインしてください。');
    }

    const existing = await this.prisma.organizerAccount.findUnique({
      where: { lineUserId: payload.lineUserId },
    });
    if (existing) throw new ConflictException('このLINEアカウントは既に登録されています');

    const tenant = await this.prisma.tenant.create({
      data: {
        id: `tenant-${Date.now()}`,
        name: orgName,
        organizerAccounts: { create: { lineUserId: payload.lineUserId } },
      },
      include: { organizerAccounts: true },
    });
    const account = tenant.organizerAccounts[0];
    return { token: this.issueToken(tenant.id, account.id), tenantId: tenant.id };
  }

  async register(email: string, password: string, orgName: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const accounts = await this.prisma.organizerAccount.findMany({ where: { email: { not: null } } });
    if (accounts.some(a => a.email?.toLowerCase() === normalizedEmail)) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = this.generateToken();

    await this.prisma.tenant.create({
      data: {
        id: `tenant-${Date.now()}`,
        name: orgName,
        organizerAccounts: {
          create: { email: normalizedEmail, passwordHash, emailVerificationToken: verificationToken },
        },
      },
    });

    await this.email.sendVerificationEmail(normalizedEmail, verificationToken).catch((err) => {
      this.logger.error(`Failed to send verification email to ${normalizedEmail}: ${err?.message ?? err}`);
    });

    return { message: '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。' };
  }

  async login(email: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const accounts = await this.prisma.organizerAccount.findMany({
      where: { email: { not: null } },
    });
    const account = accounts.find(a => a.email?.toLowerCase() === trimmedEmail) ?? null;
    if (!account?.passwordHash) throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    if (!account.emailVerifiedAt) throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    const superadminEmail = this.config.get<string>('SUPERADMIN_EMAIL');
    const isSuperadmin = !!superadminEmail && account.email === superadminEmail;
    return {
      token: this.issueToken(account.tenantId, account.id, isSuperadmin),
      tenantId: account.tenantId,
      emailVerified: true,
    };
  }

  async reconfirmPassword(tenantId: string, accountId: string, email: string, password: string): Promise<{ reauthToken: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const account = await this.prisma.organizerAccount.findUnique({ where: { id: accountId } });
    if (!account || account.tenantId !== tenantId || !account.email || account.email.toLowerCase() !== trimmedEmail || !account.passwordHash) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    return {
      reauthToken: this.jwtService.sign(
        { tenantId, accountId, purpose: 'sensitive-settings' },
        { expiresIn: '10m' },
      ),
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const account = await this.prisma.organizerAccount.findUnique({
      where: { emailVerificationToken: token },
    });
    if (!account) throw new BadRequestException('無効または期限切れのリンクです');
    if (account.emailVerifiedAt) return { message: '既に確認済みです' };

    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: { emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
    return { message: 'メールアドレスを確認しました' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const accounts = await this.prisma.organizerAccount.findMany({
      where: { email: { not: null } },
    });
    const account = accounts.find(a => a.email?.toLowerCase() === trimmedEmail) ?? null;

    // セキュリティのため、アカウントが存在しない場合も同じレスポンスを返す
    if (!account?.passwordHash) {
      return { message: 'パスワードリセットメールを送信しました（メールアドレスが登録されている場合）' };
    }

    const resetToken = this.generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間

    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: { passwordResetToken: resetToken, passwordResetExpiresAt: expiresAt },
    });

    await this.email.sendPasswordResetEmail(account.email!, resetToken).catch(() => null);

    return { message: 'パスワードリセットメールを送信しました（メールアドレスが登録されている場合）' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const account = await this.prisma.organizerAccount.findUnique({
      where: { passwordResetToken: token },
    });
    if (!account || !account.passwordResetExpiresAt) {
      throw new BadRequestException('無効または期限切れのリンクです');
    }
    if (account.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('リンクの有効期限が切れています。もう一度やり直してください。');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return { message: 'パスワードをリセットしました' };
  }

  async setEmailPassword(tenantId: string, accountId: string, email: string, password: string): Promise<{ message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const account = await this.prisma.organizerAccount.findUnique({ where: { id: accountId } });
    if (!account || account.tenantId !== tenantId) throw new UnauthorizedException();
    if (account.passwordHash) throw new BadRequestException('既にパスワードが設定されています');

    const existing = await this.prisma.organizerAccount.findMany({ where: { email: { not: null } } });
    if (existing.some(a => a.email?.toLowerCase() === trimmedEmail)) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = this.generateToken();
    await this.prisma.organizerAccount.update({
      where: { id: accountId },
      data: { email: trimmedEmail, passwordHash, emailVerificationToken: verificationToken },
    });
    await this.email.sendVerificationEmail(trimmedEmail, verificationToken).catch(() => null);
    return { message: 'メールアドレスとパスワードを設定しました' };
  }

  async resendVerificationEmail(tenantId: string, accountId: string): Promise<{ message: string }> {
    const account = await this.prisma.organizerAccount.findUnique({ where: { id: accountId } });
    if (!account?.email) throw new BadRequestException('メールアドレスが設定されていません');
    if (account.emailVerifiedAt) return { message: '既に確認済みです' };

    const token = this.generateToken();
    await this.prisma.organizerAccount.update({
      where: { id: accountId },
      data: { emailVerificationToken: token },
    });
    await this.email.sendVerificationEmail(account.email, token);
    return { message: '確認メールを再送しました' };
  }

  async resendVerificationEmailByEmail(email: string): Promise<{ message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const accounts = await this.prisma.organizerAccount.findMany({ where: { email: { not: null } } });
    const account = accounts.find(a => a.email?.toLowerCase() === trimmedEmail) ?? null;
    const msg = { message: '確認メールを送信しました（登録済みの場合）' };
    if (!account?.email || account.emailVerifiedAt) return msg;

    const token = this.generateToken();
    await this.prisma.organizerAccount.update({
      where: { id: account.id },
      data: { emailVerificationToken: token },
    });
    await this.email.sendVerificationEmail(account.email, token).catch((err) => {
      this.logger.error(`Failed to resend verification email to ${account.email}: ${err?.message ?? err}`);
    });
    return msg;
  }

  async getMe(tenantId: string, accountId: string) {
    const account = await this.prisma.organizerAccount.findUnique({ where: { id: accountId } });
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
