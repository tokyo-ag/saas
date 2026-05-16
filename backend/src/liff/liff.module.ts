import { Module } from '@nestjs/common';
import { LiffController } from './liff.controller';
import { LiffService } from './liff.service';
import { StripeModule } from '../stripe/stripe.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [StripeModule, PushModule],
  controllers: [LiffController],
  providers: [LiffService],
})
export class LiffModule {}
