import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  Body,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { validateSignature } from '@line/bot-sdk';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':tenantId')
  @HttpCode(200)
  async handleWebhook(
    @Param('tenantId') tenantId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-line-signature') signature: string,
    @Body() body: any,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant?.lineChannelSecret || !req.rawBody) {
      this.logger.warn(
        `Webhook rejected for tenant=${tenantId} missing secret or rawBody`,
      );
      throw new UnauthorizedException('LINE webhook not configured');
    }
    const valid = validateSignature(
      req.rawBody.toString(),
      tenant.lineChannelSecret,
      signature ?? '',
    );
    if (!valid) {
      this.logger.warn(`Invalid LINE signature for tenant=${tenantId}`);
      throw new UnauthorizedException('Invalid LINE signature');
    }
    this.logger.debug(
      `Valid LINE webhook received for tenant=${tenantId} payloadLength=${req.rawBody.length}`,
    );
    return this.webhookService.handleWebhook(tenantId, body);
  }
}
