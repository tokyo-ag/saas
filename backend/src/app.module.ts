import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { PublicPagesModule } from './public-pages/public-pages.module';
import { BlogModule } from './blog/blog.module';
import { MobileManageModule } from './mobile-manage/mobile-manage.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
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
    PublicPagesModule,
    BlogModule,
    MobileManageModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
