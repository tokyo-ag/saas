import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

// 通常のフル管理者トークンと、超簡単モバイル管理のマジックリンク
// トークンの両方を受け付けるガード。予約ページ関連（イベントCRUD・
// 予約一覧・CSV）など、超簡単モバイル管理からも操作させたいエンド
// ポイントにのみ使う。それ以外の管理画面エンドポイントは引き続き
// AdminGuard（mobile-manageスコープを拒否）のままにする。
@Injectable()
export class AdminOrMobileManageGuard implements CanActivate {
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
    if (payload?.scope === 'mobile-manage') {
      if (!payload?.tenantId)
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
    req.user = payload;
    return true;
  }
}
