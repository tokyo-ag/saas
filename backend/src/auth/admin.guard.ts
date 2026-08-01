import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: unknown }>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer '))
      throw new UnauthorizedException('認証が必要です');
    try {
      const payload = this.jwtService.verify(auth.slice(7));
      if (payload?.scope === 'mobile-manage')
        throw new UnauthorizedException('トークンが無効です');
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('トークンが無効です');
    }
  }
}
