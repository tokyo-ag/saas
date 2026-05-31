import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LiffController } from './liff.controller';
import { LiffService } from './liff.service';
import { TenantCodeMiddleware } from './tenant-code.middleware';
import { StripeModule } from '../stripe/stripe.module';
import { LiffGuard } from '../auth/liff.guard';

@Module({
  imports: [StripeModule],
  controllers: [LiffController],
  providers: [LiffService, TenantCodeMiddleware, LiffGuard],
})
export class LiffModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantCodeMiddleware).forRoutes(LiffController);
  }
}
