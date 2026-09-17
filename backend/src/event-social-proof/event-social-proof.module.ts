import { Module } from '@nestjs/common';
import { EventSocialProofService } from './event-social-proof.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EventSocialProofService],
  exports: [EventSocialProofService],
})
export class EventSocialProofModule {}
