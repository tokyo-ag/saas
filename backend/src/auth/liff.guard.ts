import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface LiffIdTokenPayload {
  sub: string;
  exp: number;
}

@Injectable()
export class LiffGuard implements CanActivate {
  private readonly cache = new Map<
    string,
    { lineUserId: string; exp: number }
  >();
  private readonly logger = new Logger(LiffGuard.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private async getExpectedChannelId(tenantId?: string): Promise<string | null> {
    if (tenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { OR: [{ id: tenantId }, { code: tenantId }] },
        select: { liffId: true },
      });
      const tenantChannelId = tenant?.liffId?.split('-')[0]?.trim();
      if (tenantChannelId) return tenantChannelId;
    }
    return (
      this.config.get<string>('LIFF_CHANNEL_ID')?.trim() ||
      this.config.get<string>('LINE_LOGIN_CHANNEL_ID')?.trim() ||
      null
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { lineUserId?: string }>();
    const auth = req.headers.authorization;
    this.logger.debug(
      `LIFF guard invoked: path=${req.path} method=${req.method} authPresent=${Boolean(auth)}`,
    );
    if (!auth?.startsWith('Bearer ')) {
      this.logger.warn('LIFF authorization header missing or malformed');
      throw new UnauthorizedException('LIFF認証が必要です');
    }

    const idToken = auth.slice(7);
    const tenantParam = req.params?.tenantId;
    const tenantId = Array.isArray(tenantParam) ? tenantParam[0] : tenantParam;
    const channelId = await this.getExpectedChannelId(tenantId);
    if (!channelId) {
      throw new UnauthorizedException('LIFF Channel IDが未設定です');
    }

    const cacheKey = `${tenantId ?? 'shared'}:${idToken}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.exp > Date.now()) {
      req.lineUserId = cached.lineUserId;
      this.logger.debug(`LIFF token cache hit for user=${cached.lineUserId}`);
      return true;
    }

    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '<no-body>');
      this.logger.warn(
        `LINE token verify failed: status=${res.status} body=${body}`,
      );
      throw new UnauthorizedException('LINEトークンが無効です');
    }

    const payload = (await res.json()) as LiffIdTokenPayload;
    req.lineUserId = payload.sub;
    this.logger.debug(`LIFF token verified for user=${payload.sub}`);

    // Cache for 5 minutes (tokens expire at 10 min; 5 min gives safety margin)
    this.cache.set(cacheKey, {
      lineUserId: payload.sub,
      exp: Date.now() + 5 * 60 * 1000,
    });
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.exp <= now) this.cache.delete(k);
      }
    }

    return true;
  }
}
