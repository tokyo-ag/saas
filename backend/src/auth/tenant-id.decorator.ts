import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { tenantId: string } }>();
    if (!req.user?.tenantId)
      throw new Error('TenantId not found in request user');
    return req.user.tenantId;
  },
);
