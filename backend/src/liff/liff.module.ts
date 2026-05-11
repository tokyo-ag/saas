import { Module } from '@nestjs/common';
import { LiffController } from './liff.controller';
import { LiffService } from './liff.service';

@Module({
  controllers: [LiffController],
  providers: [LiffService],
})
export class LiffModule {}
