import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  async handleWebhook(tenantId: string, body: any): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      this.logger.warn(`Tenant not found: ${tenantId}`);
      return;
    }

    const events: any[] = body?.events ?? [];
    for (const event of events) {
      try {
        if (event.type === 'follow' && event.source?.type === 'user') {
          this.logger.log(`New follower received: ${event.source.userId}`);
          if (event.replyToken && tenant.lineChannelAccessToken) {
            await this.lineMessaging.replyText(
              tenant.lineChannelAccessToken,
              event.replyToken,
              '友だち追加ありがとうございます。COMIUの通知設定画面で発行した「連携 XXXXXXXX」を、このトークへ送信してください。',
            );
          }
        } else if (
          event.type === 'message' &&
          event.source?.type === 'user' &&
          event.message?.type === 'text'
        ) {
          await this.handleLinkCode(
            tenantId,
            tenant.lineChannelAccessToken,
            event.source.userId,
            event.message.text,
            event.replyToken,
          );
        } else {
          this.logger.debug(
            `Unhandled webhook event for tenant=${tenantId}: ${JSON.stringify({ type: event.type, source: event.source })}`,
          );
        }
      } catch (err) {
        this.logger.error(`Failed to process webhook event: ${String(err)}`);
      }
    }
  }

  private async handleLinkCode(
    tenantId: string,
    accessToken: string | null,
    messagingLineUserId: string,
    text: string,
    replyToken?: string,
  ) {
    const match = text.trim().match(/^連携\s+([A-Z0-9_-]{8})$/i);
    if (!match) return;

    const link = await this.prisma.lineNotificationLinkCode.findFirst({
      where: {
        code: match[1].toUpperCase(),
        tenantId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, memberId: true },
    });
    let reply = '連携コードが無効か、有効期限が切れています。COMIUから新しいコードを発行してください。';

    if (link) {
      const alreadyLinked = await this.prisma.member.findFirst({
        where: { tenantId, messagingLineUserId, id: { not: link.memberId } },
        select: { id: true },
      });
      if (alreadyLinked) {
        reply = 'このLINEアカウントは、すでに別のCOMIU参加者と連携されています。';
      } else {
        await this.prisma.$transaction([
          this.prisma.member.update({
            where: { id: link.memberId },
            data: { messagingLineUserId },
          }),
          this.prisma.lineNotificationLinkCode.update({
            where: { id: link.id },
            data: { usedAt: new Date() },
          }),
        ]);
        const upcoming = await this.prisma.reservation.findFirst({
          where: {
            memberId: link.memberId,
            status: { in: ['reserved', 'waitlisted', 'waiting_payment'] },
            event: { heldAt: { gte: new Date() } },
          },
          include: { event: true },
          orderBy: { reservedAt: 'desc' },
        });
        reply = 'COMIUとの連携が完了しました。今後、予約完了やリマインドをこのアカウントへお届けします。';
        if (upcoming) {
          const heldAt = upcoming.event.heldAt.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
          });
          reply += `\n\n【${upcoming.event.title}】\n日時：${heldAt}\n場所：${upcoming.event.location}`;
        }
      }
    }

    if (accessToken && replyToken) {
      await this.lineMessaging.replyText(accessToken, replyToken, reply);
    }
  }
}
