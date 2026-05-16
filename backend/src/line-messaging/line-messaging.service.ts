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
    if (!accessToken || !lineUserId) {
      this.logger.log(`[DEV] LINE未設定のため送信スキップ → to: ${lineUserId || '(不明)'}\n${text}`);
      return;
    }
    try {
      const client = this.getClient(accessToken);
      await client.pushMessage({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      });
      this.logger.log(`LINE push sent → to: ${lineUserId}`);
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
    price?: number,
    description?: string | null,
  ): Promise<void> {
    const dateStr = this.formatDate(heldAt);
    const priceStr = price != null ? (price === 0 ? '無料' : `¥${price.toLocaleString()}`) : null;
    const lines = [
      `【${eventTitle}】ご予約ありがとうございます！`,
      `日時：${dateStr}`,
      `場所：${location}`,
      ...(priceStr ? [`料金：${priceStr}`] : []),
      ...(description ? [`\n${description.slice(0, 300)}${description.length > 300 ? '…' : ''}`] : []),
    ];
    await this.sendPushMessage(accessToken, lineUserId, lines.join('\n'));
  }

  async sendTalkNotification(
    accessToken: string,
    lineUserId: string,
    senderName: string,
    content: string,
  ): Promise<void> {
    const preview = content.length > 50 ? content.slice(0, 50) + '…' : content;
    await this.sendPushMessage(
      accessToken,
      lineUserId,
      `💬 ${senderName}さんからメッセージが届きました\n「${preview}」`,
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

  async getLineProfile(accessToken: string, lineUserId: string): Promise<{ displayName: string; pictureUrl?: string } | null> {
    if (!accessToken || !lineUserId) return null;
    try {
      const client = this.getClient(accessToken);
      const profile = await client.getProfile(lineUserId);
      return { displayName: profile.displayName, pictureUrl: profile.pictureUrl };
    } catch {
      return null;
    }
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
