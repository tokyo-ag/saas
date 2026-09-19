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

interface LiffAccessTokenPayload {
  client_id?: string;
  expires_in?: number;
  scope?: string;
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

  private async getExpectedChannelId(
    tenantId?: string,
  ): Promise<string | null> {
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

    const idTokenResponse = await fetch(
      'https://api.line.me/oauth2/v2.1/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
      },
    );

    let lineUserId = '';
    let cacheTtlMs = 5 * 60 * 1000;

    if (idTokenResponse.ok) {
      const payload = (await idTokenResponse.json()) as LiffIdTokenPayload;
      lineUserId = payload.sub;
      if (typeof payload.exp === 'number') {
        cacheTtlMs = Math.min(
          cacheTtlMs,
          Math.max(1, payload.exp * 1000 - Date.now()),
        );
      }
    } else {
      // openid scopeがないLIFFでは、ログイン済みでもIDトークンが取得できない。
      // その場合はアクセストークンの発行元チャネルを検証してからプロフィールを取得する。
      const idTokenError = await idTokenResponse
        .text()
        .catch(() => '<no-body>');
      const accessTokenResponse = await fetch(
        `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(idToken)}`,
      );
      const accessPayload = (await accessTokenResponse
        .json()
        .catch(() => ({}))) as LiffAccessTokenPayload;
      const accessTokenValid =
        accessTokenResponse.ok &&
        accessPayload.client_id === channelId &&
        typeof accessPayload.expires_in === 'number' &&
        accessPayload.expires_in > 0;

      if (accessTokenValid) {
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const profile = (await profileResponse.json().catch(() => ({}))) as {
          userId?: string;
        };
        if (profileResponse.ok && profile.userId) {
          lineUserId = profile.userId;
          cacheTtlMs = Math.min(
            cacheTtlMs,
            Math.max(1, accessPayload.expires_in! * 1000),
          );
        }
      }

      if (!lineUserId) {
        this.logger.warn(
          `LINE token verify failed: idStatus=${idTokenResponse.status} idBody=${idTokenError} accessStatus=${accessTokenResponse.status}`,
        );
        throw new UnauthorizedException('LINEトークンが無効です');
      }
    }

    req.lineUserId = lineUserId;
    this.logger.debug(`LIFF token verified for user=${lineUserId}`);

    // Cache for 5 minutes (tokens expire at 10 min; 5 min gives safety margin)
    this.cache.set(cacheKey, {
      lineUserId,
      exp: Date.now() + cacheTtlMs,
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
