import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

// 超簡単モバイル管理のマジックリンク経由セッション専用ガード。
// JWTの署名だけでなく、発行時点のmobileManageTokenが現在もTenantに
// 残っているか毎回DBで確認する - これにより管理画面からのリンク再発行
// （＝旧トークンの無効化）が、既に発行済みのJWTにも即座に反映される。
@Injectable()
export class MobileManageGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: unknown }>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer '))
      throw new UnauthorizedException('認証が必要です');
    let payload: any;
    try {
      payload = this.jwtService.verify(auth.slice(7));
    } catch {
      throw new UnauthorizedException('トークンが無効です');
    }
    if (payload?.scope !== 'mobile-manage' || !payload?.tenantId)
      throw new UnauthorizedException('トークンが無効です');
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: { mobileManageToken: true },
    });
    if (!tenant?.mobileManageToken || tenant.mobileManageToken !== payload.token)
      throw new UnauthorizedException('リンクが無効化されています');
    req.user = { tenantId: payload.tenantId };
    return true;
  }
}
