import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';

// Stripeのチェックアウトセッションは既定で24時間後に失効する。
// checkout.session.expired Webhookで即時解放するのが基本だが、各団体が
// 自分のStripeダッシュボードで設定するWebhookがこのイベント種別を
// 購読していない場合に備え、Stripe側の失効より確実に後になるしきい値で
// 保険として解放する（支払済みの予約を誤ってキャンセルする競合は起きない）。
const ABANDONED_PAYMENT_HOURS = 25;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  // 1時間おきに実行：決済未完了のまま放置された予約を解放し、枠を空ける。
  @Cron(CronExpression.EVERY_HOUR)
  async releaseAbandonedPayments() {
    const cutoff = new Date(
      Date.now() - ABANDONED_PAYMENT_HOURS * 60 * 60 * 1000,
    );
    const result = await this.prisma.reservation.updateMany({
      where: {
        status: ReservationStatus.waiting_payment,
        reservedAt: { lt: cutoff },
      },
      data: { status: ReservationStatus.cancelled },
    });
    if (result.count > 0) {
      this.logger.log(
        `Released ${result.count} abandoned waiting_payment reservation(s)`,
      );
    }
  }

  // 毎分実行：リマインド送信が必要なイベントを探して送信
  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders() {
    const now = new Date();

    const events = await this.prisma.event.findMany({
      where: {
        remindEnabled: true,
        remindAt: { lte: now },
        remindedAt: null,
      },
    });

    for (const event of events) {
      this.logger.log(`Sending reminders for event: ${event.title}`);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: event.tenantId },
      });
      if (!tenant?.lineChannelAccessToken) {
        // LINE未設定なら送信をスキップして済み扱いにする
        await this.prisma.event.update({
          where: { id: event.id },
          data: { remindedAt: now },
        });
        continue;
      }

      // 参加確定している予約者全員に送信
      const reservations = await this.prisma.reservation.findMany({
        where: {
          eventId: event.id,
          status: { in: ['reserved', 'attended'] },
        },
        include: { member: true },
      });

      for (const r of reservations) {
        if (r.member.lineUserId && tenant?.lineChannelAccessToken) {
          await this.lineMessaging.sendRemind(
            tenant.lineChannelAccessToken,
            r.member.lineUserId,
            event.title,
            event.heldAt,
            event.location,
            event.reminderMessageTemplate ?? tenant.reminderMessageTemplate,
            {
              endAt: event.endAt,
              locationUrl: event.locationUrl,
              price: event.price,
              priceMale: event.priceMale,
              priceFemale: event.priceFemale,
              description: event.description,
              descriptionMale: event.descriptionMale,
              descriptionFemale: event.descriptionFemale,
              maleDelayMinutes: event.maleDelayMinutes,
              gender: r.member.gender,
              includeDescriptionByDefault:
                !event.reminderMessageTemplate?.trim(),
            },
          );
        }
      }

      // 送信完了時刻を記録（2重送信防止）
      await this.prisma.event.update({
        where: { id: event.id },
        data: { remindedAt: now },
      });

      this.logger.log(
        `Sent ${reservations.length} reminders for event: ${event.title}`,
      );
    }
  }
}
