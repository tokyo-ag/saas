import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlogModule } from '../blog/blog.module';
import { EventSocialProofModule } from '../event-social-proof/event-social-proof.module';
import { CollabModule } from '../collab/collab.module';

@Module({
  imports: [PrismaModule, BlogModule, EventSocialProofModule, CollabModule],
  controllers: [PublicController],
})
export class PublicModule {}
