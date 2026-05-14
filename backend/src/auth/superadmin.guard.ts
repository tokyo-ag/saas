import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; user: unknown }>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('認証が必要です');
    let payload: { isSuperadmin?: boolean };
    try {
      payload = this.jwtService.verify(auth.slice(7));
    } catch {
      throw new UnauthorizedException('トークンが無効です');
    }
    if (!payload.isSuperadmin) throw new ForbiddenException('スーパー管理者権限が必要です');
    req.user = payload;
    return true;
  }
}
