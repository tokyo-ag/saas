import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  async handleWebhook(tenantId: string, body: any): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      this.logger.warn(`Tenant not found: ${tenantId}`);
      return;
    }

    const events: any[] = body?.events ?? [];
    this.logger.debug(
      `Handling webhook events for tenant=${tenantId}, count=${events.length}`,
    );

    for (const event of events) {
      try {
        this.logger.debug(
          `Webhook event: type=${event.type} sourceType=${event.source?.type}`,
        );
        if (event.type === 'follow' && event.source.type === 'user') {
          const lineUserId = event.source.userId;
          // 友だち追加 → 参加者テーブルに登録（まだ名前などは未入力）
          await this.prisma.member.upsert({
            where: { tenantId_lineUserId: { tenantId, lineUserId } },
            create: { tenantId, lineUserId },
            update: {},
          });
          this.logger.log(`New follower registered: ${lineUserId}`);
        } else {
          // 未処理イベントはデバッグログに出す
          this.logger.debug(
            `Unhandled webhook event for tenant=${tenantId}: ${JSON.stringify({ type: event.type, source: event.source })}`,
          );
        }
      } catch (err) {
        this.logger.error(`Failed to process webhook event: ${err}`);
      }
    }
  }
}
