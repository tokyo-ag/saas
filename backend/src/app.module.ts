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
import { UploadModule } from './upload/upload.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { StripeModule } from './stripe/stripe.module';
import { AuthModule } from './auth/auth.module';
import { PublicModule } from './public/public.module';

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
    UploadModule,
    SuperadminModule,
    StripeModule,
    AuthModule,
    PublicModule,
  ],
})
export class AppModule {}
