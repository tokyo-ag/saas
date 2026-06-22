import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicPagesController } from './public-pages.controller';
import { PublicPagesService } from './public-pages.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicPagesController],
  providers: [PublicPagesService],
})
export class PublicPagesModule {}
