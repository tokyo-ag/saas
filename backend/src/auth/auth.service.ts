import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private issueToken(tenantId: string, accountId: string): string {
    return this.jwtService.sign({ tenantId, accountId });
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
    const existing = await this.prisma.organizerAccount.findUnique({ where: { email } });
    if (existing) throw new ConflictException('このメールアドレスは既に登録されています');
    const passwordHash = await bcrypt.hash(password, 10);
    const tenant = await this.prisma.tenant.create({
      data: {
        id: `tenant-${Date.now()}`,
        name: orgName,
        organizerAccounts: { create: { email, passwordHash } },
      },
      include: { organizerAccounts: true },
    });
    const account = tenant.organizerAccounts[0];
    return { token: this.issueToken(tenant.id, account.id), tenantId: tenant.id };
  }

  async login(email: string, password: string) {
    const account = await this.prisma.organizerAccount.findUnique({ where: { email } });
    if (!account?.passwordHash) throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    return { token: this.issueToken(account.tenantId, account.id), tenantId: account.tenantId };
  }

  async getMe(tenantId: string, accountId: string) {
    const account = await this.prisma.organizerAccount.findUnique({ where: { id: accountId } });
    return { tenantId, accountId, lineUserId: account?.lineUserId };
  }
}
