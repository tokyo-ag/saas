import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlogModule } from '../blog/blog.module';

@Module({
  imports: [PrismaModule, BlogModule],
  controllers: [PublicController],
})
export class PublicModule {}
