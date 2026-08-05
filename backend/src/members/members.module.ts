import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { LineMessagingModule } from '../line-messaging/line-messaging.module';

@Module({
  imports: [LineMessagingModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
