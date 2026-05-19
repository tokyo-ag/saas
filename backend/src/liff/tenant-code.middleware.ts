import { Injectable, NestMiddleware } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantCodeMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: any, _res: any, next: () => void) {
    const code = req.params?.tenantId;
    if (code) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { OR: [{ code }, { id: code }] },
        select: { id: true },
      });
      if (tenant) req.params.tenantId = tenant.id;
    }
    next();
  }
}
