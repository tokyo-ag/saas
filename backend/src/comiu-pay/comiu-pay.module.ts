import { Module } from '@nestjs/common';
import { ComiuPayController } from './comiu-pay.controller';
import { ComiuPayService } from './comiu-pay.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [ComiuPayController],
  providers: [ComiuPayService],
})
export class ComiuPayModule {}
