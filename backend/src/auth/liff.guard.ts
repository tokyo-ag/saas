import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

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

  constructor(private config: ConfigService) {}

  private getExpectedChannelId(): string | null {
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
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('LIFF認証が必要です');
    }

    const idToken = auth.slice(7);
    const channelId = this.getExpectedChannelId();
    if (!channelId) {
      throw new UnauthorizedException('LIFF Channel IDが未設定です');
    }

    const cached = this.cache.get(idToken);
    if (cached && cached.exp > Date.now()) {
      req.lineUserId = cached.lineUserId;
      return true;
    }

    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });

    if (!res.ok) {
      throw new UnauthorizedException('LINEトークンが無効です');
    }

    const payload = (await res.json()) as LiffIdTokenPayload;
    req.lineUserId = payload.sub;

    // Cache for 5 minutes (tokens expire at 10 min; 5 min gives safety margin)
    this.cache.set(idToken, {
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
