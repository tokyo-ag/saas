import { Controller, Post, Param, Body, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // LINE から届く通知を受け取る
  @Post(':tenantId')
  @HttpCode(200)
  handleWebhook(@Param('tenantId') tenantId: string, @Body() body: any) {
    return this.webhookService.handleWebhook(tenantId, body);
  }
}
