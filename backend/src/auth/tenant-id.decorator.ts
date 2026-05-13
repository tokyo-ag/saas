import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user?: { tenantId: string } }>();
    return req.user?.tenantId ?? process.env.TENANT_ID ?? 'tenant-001';
  },
);
