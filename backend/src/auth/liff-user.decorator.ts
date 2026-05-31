import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const LiffUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ lineUserId?: string }>();
    return req.lineUserId ?? '';
  },
);
