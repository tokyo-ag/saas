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

    for (const event of events) {
      if (event.type === 'follow' && event.source.type === 'user') {
        const lineUserId = event.source.userId;
        // 友だち追加 → 参加者テーブルに登録（まだ名前などは未入力）
        await this.prisma.member.upsert({
          where: { tenantId_lineUserId: { tenantId, lineUserId } },
          create: { tenantId, lineUserId },
          update: {},
        });
        this.logger.log(`New follower registered: ${lineUserId}`);
      }
    }
  }
}
