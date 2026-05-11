import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { MembersModule } from './members/members.module';
import { ReservationsModule } from './reservations/reservations.module';
import { LiffModule } from './liff/liff.module';
import { WebhookModule } from './webhook/webhook.module';
import { LineMessagingModule } from './line-messaging/line-messaging.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EventsModule,
    MembersModule,
    ReservationsModule,
    LiffModule,
    WebhookModule,
    LineMessagingModule,
    SchedulerModule,
    TenantModule,
  ],
})
export class AppModule {}
