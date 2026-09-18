import { Injectable, Logger } from '@nestjs/common';
import * as line from '@line/bot-sdk';

type EventMessageDetails = {
  endAt?: Date | null;
  locationUrl?: string | null;
  priceMale?: number | null;
  priceFemale?: number | null;
  description?: string | null;
  descriptionMale?: string | null;
  descriptionFemale?: string | null;
  maleDelayMinutes?: number | null;
  gender?: string | null;
  includeDescriptionByDefault?: boolean;
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
    const text = this.composeReservationConfirmMessage(
      eventTitle,
      heldAt,
      location,
      price,
      description,
      customTemplate,
      details,
    );
    await this.sendPushMessage(accessToken, lineUserId, text);
  }

  // 予約完了時に実際に送信する文面を、送信せずに組み立てる。
  composeReservationConfirmMessage(
    eventTitle: string,
    heldAt: Date,
    location: string,
    price?: number,
    description?: string | null,
    customTemplate?: string | null,
    details: EventMessageDetails = {},
  ): string {
    const dateStr = this.formatDate(heldAt, details.endAt, details.maleDelayMinutes, details.gender);
    const locationStr = this.formatLocation(location, details.locationUrl);
    const priceStr = this.formatPrice(
      price,
      details.priceMale,
      details.priceFemale,
    );
    const effectiveDescription = this.formatDescription(
      description,
      details.descriptionMale,
      details.descriptionFemale,
    );
    if (customTemplate?.trim()) {
      const effectiveTemplate = this.omitRedundantTitle(
        customTemplate,
        eventTitle,
        effectiveDescription,
      );
      const text = this.applyTemplate(effectiveTemplate, {
        title: eventTitle,
        date: dateStr,
        location: locationStr,
        price: priceStr ?? '',
        description: effectiveDescription ?? '',
      });
      return text;
    }
    const descriptionStartsWithTitle = Boolean(
      eventTitle.trim() &&
        effectiveDescription?.trimStart().startsWith(eventTitle.trim()),
    );
    const lines = [
      descriptionStartsWithTitle
        ? 'ご予約ありがとうございます！'
        : `【${eventTitle}】ご予約ありがとうございます！`,
      `日時：${dateStr}`,
      ...(priceStr ? [`参加費：${priceStr}`] : []),
      `場所：${locationStr}`,
      ...(effectiveDescription
        ? [
            `\n${effectiveDescription.slice(0, 300)}${effectiveDescription.length > 300 ? '…' : ''}`,
          ]
        : []),
    ];
    return lines.join('\n');
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
    const text = this.composeRemindMessage(eventTitle, heldAt, location, customTemplate, details);
    await this.sendPushMessage(accessToken, lineUserId, text);
  }

  // 実際に送信される前日・当日リマインド文面を、送信せずに組み立てる。
  composeRemindMessage(
    eventTitle: string,
    heldAt: Date,
    location: string,
    customTemplate?: string | null,
    details: EventMessageDetails & { price?: number | null } = {},
  ): string {
    const dateStr = this.formatDate(heldAt, details.endAt, details.maleDelayMinutes, details.gender);
    const locationStr = this.formatLocation(location, details.locationUrl);
    const priceStr = this.formatPrice(
      details.price,
      details.priceMale,
      details.priceFemale,
    );
    const effectiveDescription = this.formatDescription(
      details.description,
      details.descriptionMale,
      details.descriptionFemale,
    );
    const renderedDescription = effectiveDescription
      ? `${effectiveDescription.slice(0, 300)}${effectiveDescription.length > 300 ? '…' : ''}`
      : '';
    if (customTemplate?.trim()) {
      const templateWithDescription =
        details.includeDescriptionByDefault &&
        renderedDescription &&
        !customTemplate.includes('{description}')
          ? `${customTemplate}\n\n{description}`
          : customTemplate;
      const effectiveTemplate = this.omitRedundantTitle(
        templateWithDescription,
        eventTitle,
        effectiveDescription,
      );
      return this.applyTemplate(effectiveTemplate, {
        title: eventTitle,
        date: dateStr,
        location: locationStr,
        price: priceStr ?? '',
        description: renderedDescription,
      });
    }
    const lines = [
      `【${eventTitle}】まもなく開催です！`,
      `日時：${dateStr}`,
      ...(priceStr ? [`参加費：${priceStr}`] : []),
      `場所：${locationStr}`,
      ...(details.includeDescriptionByDefault && renderedDescription
        ? [`\n${renderedDescription}`]
        : []),
    ];
    return lines.join('\n');
  }

  private applyTemplate(
    template: string,
    vars: Record<string, string>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
  }

  private omitRedundantTitle(
    template: string,
    eventTitle: string,
    description?: string | null,
  ): string {
    const normalizedTitle = eventTitle.trim();
    const descriptionStartsWithTitle = Boolean(
      normalizedTitle && description?.trimStart().startsWith(normalizedTitle),
    );
    if (!descriptionStartsWithTitle || !template.includes('{description}')) {
      return template;
    }
    return template.replace(/【\s*\{title\}\s*】/g, '').replace(/\{title\}/g, '');
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

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo',
    });
  }

  private formatDate(
    date: Date,
    endAt?: Date | null,
    maleDelayMinutes?: number | null,
    gender?: string | null,
  ): string {
    const heldAt = new Date(date);
    const day = heldAt.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'Asia/Tokyo',
    });
    const endTime = endAt ? this.formatTime(new Date(endAt)) : null;
    if (maleDelayMinutes) {
      // 受信者の性別が分かる場合は、その性別の集合時間だけを案内する。
      // 不明な場合のみ両方を併記する。
      if (gender === '男性') {
        const maleStart = this.formatTime(
          new Date(heldAt.getTime() + maleDelayMinutes * 60000),
        );
        return `${day}${maleStart}${endTime ? `~${endTime}` : ''}`;
      }
      if (gender === '女性') {
        const femaleStart = this.formatTime(heldAt);
        return `${day}${femaleStart}${endTime ? `~${endTime}` : ''}`;
      }
      const femaleStart = this.formatTime(heldAt);
      const maleStart = this.formatTime(
        new Date(heldAt.getTime() + maleDelayMinutes * 60000),
      );
      return `${day}男性${maleStart}/女性${femaleStart}${endTime ? `~${endTime}` : ''}`;
    }
    const startTime = this.formatTime(heldAt);
    return `${day}${startTime}${endTime ? `~${endTime}` : ''}`;
  }

  private formatPrice(
    price?: number | null,
    priceMale?: number | null,
    priceFemale?: number | null,
  ): string | null {
    if (priceMale != null && priceFemale != null) {
      return `男性🚹${priceMale.toLocaleString('ja-JP')}円\n女性🚺${priceFemale.toLocaleString('ja-JP')}円`;
    }
    if (price == null) return null;
    return price === 0 ? '無料' : `${price.toLocaleString('ja-JP')}円`;
  }

  private formatDescription(
    description?: string | null,
    descriptionMale?: string | null,
    descriptionFemale?: string | null,
  ): string | null {
    if (descriptionMale?.trim() || descriptionFemale?.trim()) {
      const parts: string[] = [];
      if (descriptionMale?.trim()) parts.push(`🚹男性の方へ\n${descriptionMale.trim()}`);
      if (descriptionFemale?.trim()) parts.push(`🚺女性の方へ\n${descriptionFemale.trim()}`);
      return parts.join('\n\n');
    }
    return description ?? null;
  }

  private formatLocation(location: string, locationUrl?: string | null): string {
    return locationUrl?.trim() ? `${location}\n${locationUrl.trim()}` : location;
  }
}
