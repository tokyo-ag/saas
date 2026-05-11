import { Global, Module } from '@nestjs/common';
import { LineMessagingService } from './line-messaging.service';

@Global()
@Module({
  providers: [LineMessagingService],
  exports: [LineMessagingService],
})
export class LineMessagingModule {}
