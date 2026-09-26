import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return (
      !!this.config.get<string>('TWILIO_ACCOUNT_SID') &&
      !!this.config.get<string>('TWILIO_AUTH_TOKEN') &&
      !!this.config.get<string>('TWILIO_FROM_NUMBER')
    );
  }

  async send(to: string, body: string): Promise<void> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn(`[DEV] SMS to ${to}: ${body}`);
      return;
    }

    const client = new Twilio(accountSid, authToken);
    try {
      await client.messages.create({ to, from: fromNumber, body });
    } catch (err: any) {
      this.logger.error(`SMS send failed: ${err?.message ?? err}`);
      throw new Error('SMS送信に失敗しました');
    }
  }
}
