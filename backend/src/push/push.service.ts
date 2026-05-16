import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    const subject = config.get<string>('VAPID_SUBJECT') ?? 'mailto:noreply@example.com';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    } else {
      this.logger.warn('VAPID keys not configured — Web Push disabled');
      this.configured = false;
    }
  }

  getVapidPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  async subscribe(tenantId: string, endpoint: string, p256dh: string, auth: string, memberId?: string | null): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { tenantId, endpoint, p256dh, auth, memberId: memberId ?? null },
      update: { tenantId, p256dh, auth, memberId: memberId ?? null },
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  private async sendToSubscriptions(subs: { endpoint: string; p256dh: string; auth: string }[], title: string, body: string): Promise<void> {
    if (!this.configured) return;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body }),
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await this.prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          } else {
            this.logger.error(`Push failed to ${sub.endpoint}: ${err.message}`);
          }
        }
      }),
    );
  }

  async sendToTenant(tenantId: string, title: string, body: string): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { tenantId, memberId: null } });
    await this.sendToSubscriptions(subs, title, body);
  }

  async sendToMember(memberId: string, title: string, body: string): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { memberId } });
    await this.sendToSubscriptions(subs, title, body);
  }
}
