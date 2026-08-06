import { Injectable, Logger } from '@nestjs/common';
import * as line from '@line/bot-sdk';

type EventMessageDetails = {
  endAt?: Date | null;
  locationUrl?: string | null;
  priceMale?: number | null;
  priceFemale?: number | null;
};

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name);

  private getClient(accessToken: string) {
    return new line.messagingApi.MessagingApiClient({
      channelAccessToken: accessToken,
    });
  }

  async sendPushMessage(
    accessToken: string,
    lineUserId: string,
    text: string,
  ): Promise<void> {
    if (!accessToken || !lineUserId) {
      this.logger.log(
        `[DEV] LINE未設定のため送信スキップ → to: ${lineUserId || '(不明)'}\n${text}`,
      );
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
      const detail =
        err && typeof err === 'object' && 'body' in err
          ? JSON.stringify((err as { body: unknown }).body)
          : String(err);
      this.logger.error(`LINE push failed to ${lineUserId}: ${err} | body: ${detail}`);
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
    customTemplate?: string | null,
    details: EventMessageDetails = {},
  ): Promise<void> {
    const dateStr = this.formatDate(heldAt, details.endAt);
    const locationStr = this.formatLocation(location, details.locationUrl);
    const priceStr = this.formatPrice(
      price,
      details.priceMale,
      details.priceFemale,
    );
    if (customTemplate?.trim()) {
      const text = this.applyTemplate(customTemplate, {
        title: eventTitle,
        date: dateStr,
        location: locationStr,
        price: priceStr ?? '',
        description: description ?? '',
      });
      await this.sendPushMessage(accessToken, lineUserId, text);
      return;
    }
    const lines = [
      `【${eventTitle}】ご予約ありがとうございます！`,
      `日時：${dateStr}`,
      ...(priceStr ? [`参加費：${priceStr}`] : []),
      `場所：${locationStr}`,
      ...(description
        ? [
            `\n${description.slice(0, 300)}${description.length > 300 ? '…' : ''}`,
          ]
        : []),
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
    customTemplate?: string | null,
    details: EventMessageDetails & { price?: number | null } = {},
  ): Promise<void> {
    const dateStr = this.formatDate(heldAt, details.endAt);
    const locationStr = this.formatLocation(location, details.locationUrl);
    const priceStr = this.formatPrice(
      details.price,
      details.priceMale,
      details.priceFemale,
    );
    if (customTemplate?.trim()) {
      const text = this.applyTemplate(customTemplate, {
        title: eventTitle,
        date: dateStr,
        location: locationStr,
        price: priceStr ?? '',
      });
      await this.sendPushMessage(accessToken, lineUserId, text);
      return;
    }
    const lines = [
      `【${eventTitle}】まもなく開催です！`,
      `日時：${dateStr}`,
      ...(priceStr ? [`参加費：${priceStr}`] : []),
      `場所：${locationStr}`,
    ];
    await this.sendPushMessage(accessToken, lineUserId, lines.join('\n'));
  }

  private applyTemplate(
    template: string,
    vars: Record<string, string>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
  }

  async getLineProfile(
    accessToken: string,
    lineUserId: string,
  ): Promise<{ displayName: string; pictureUrl?: string } | null> {
    if (!accessToken || !lineUserId) return null;
    try {
      const client = this.getClient(accessToken);
      const profile = await client.getProfile(lineUserId);
      return {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      };
    } catch {
      return null;
    }
  }

  private formatDate(date: Date, endAt?: Date | null): string {
    const heldAt = new Date(date);
    const day = heldAt.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'Asia/Tokyo',
    });
    const startTime = heldAt.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo',
    });
    const endTime = endAt
      ? new Date(endAt).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Tokyo',
        })
      : null;
    return `${day}${startTime}${endTime ? `~${endTime}` : ''}`;
  }

  private formatPrice(
    price?: number | null,
    priceMale?: number | null,
    priceFemale?: number | null,
  ): string | null {
    if (priceMale != null && priceFemale != null) {
      return `男性🚹${priceMale.toLocaleString('ja-JP')}円、女性🚺${priceFemale.toLocaleString('ja-JP')}円`;
    }
    if (price == null) return null;
    return price === 0 ? '無料' : `${price.toLocaleString('ja-JP')}円`;
  }

  private formatLocation(location: string, locationUrl?: string | null): string {
    return locationUrl?.trim() ? `${location}\n${locationUrl.trim()}` : location;
  }
}
