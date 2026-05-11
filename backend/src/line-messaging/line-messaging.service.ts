import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as line from '@line/bot-sdk';

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name);

  private getClient(accessToken: string) {
    return new line.messagingApi.MessagingApiClient({ channelAccessToken: accessToken });
  }

  async sendPushMessage(accessToken: string, lineUserId: string, text: string): Promise<void> {
    if (!accessToken || !lineUserId) return;
    try {
      const client = this.getClient(accessToken);
      await client.pushMessage({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      });
    } catch (err) {
      this.logger.error(`LINE push failed to ${lineUserId}: ${err}`);
    }
  }

  async sendReservationConfirm(
    accessToken: string,
    lineUserId: string,
    eventTitle: string,
    heldAt: Date,
    location: string,
  ): Promise<void> {
    const dateStr = this.formatDate(heldAt);
    await this.sendPushMessage(
      accessToken,
      lineUserId,
      `【${eventTitle}】ご予約ありがとうございます！\n日時：${dateStr}\n場所：${location}`,
    );
  }

  async sendWaitlistRegistered(
    accessToken: string,
    lineUserId: string,
    eventTitle: string,
    order: number,
  ): Promise<void> {
    await this.sendPushMessage(
      accessToken,
      lineUserId,
      `【${eventTitle}】は満席のためキャンセル待ち${order}番目に登録しました。`,
    );
  }

  async sendWaitlistPromoted(
    accessToken: string,
    lineUserId: string,
    eventTitle: string,
    heldAt: Date,
    location: string,
  ): Promise<void> {
    const dateStr = this.formatDate(heldAt);
    await this.sendPushMessage(
      accessToken,
      lineUserId,
      `キャンセルが出たため【${eventTitle}】の予約が確定しました！\n日時：${dateStr}\n場所：${location}`,
    );
  }

  async sendCancelNotifyToOrganizer(
    accessToken: string,
    organizerLineUserId: string,
    memberName: string,
    eventTitle: string,
  ): Promise<void> {
    if (!organizerLineUserId) return;
    await this.sendPushMessage(
      accessToken,
      organizerLineUserId,
      `${memberName}さんが【${eventTitle}】をキャンセルしました。`,
    );
  }

  async sendRemind(
    accessToken: string,
    lineUserId: string,
    eventTitle: string,
    heldAt: Date,
    location: string,
  ): Promise<void> {
    const dateStr = this.formatDate(heldAt);
    await this.sendPushMessage(
      accessToken,
      lineUserId,
      `【${eventTitle}】まもなく開催です！\n日時：${dateStr}\n場所：${location}`,
    );
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    });
  }
}
