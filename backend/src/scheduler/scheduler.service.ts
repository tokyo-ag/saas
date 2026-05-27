import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

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

      const dateStr = new Date(event.heldAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
      });
      for (const r of reservations) {
        if (r.member.lineUserId && tenant?.lineChannelAccessToken) {
          await this.lineMessaging.sendRemind(
            tenant.lineChannelAccessToken,
            r.member.lineUserId,
            event.title,
            event.heldAt,
            event.location,
          );
        }
        if (event.remindApp) {
          await this.prisma.notification.create({
            data: {
              tenantId: event.tenantId,
              memberId: r.member.id,
              title: 'イベントリマインド',
              body: `【${event.title}】まもなく開催です！\n日時：${dateStr}\n場所：${event.location}`,
            },
          });
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
