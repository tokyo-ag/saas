import {
  Controller, Post, Param, Headers, Req, HttpCode, BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('stripe-webhook')
export class StripeWebhookController {
  constructor(
    private stripe: StripeService,
    private prisma: PrismaService,
  ) {}

  @Post(':tenantId')
  @HttpCode(200)
  async handleWebhook(
    @Param('tenantId') tenantId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeWebhookSecret) throw new BadRequestException('Webhook not configured');

    let event: any;
    try {
      event = this.stripe.constructEvent(tenant.stripeWebhookSecret, req.rawBody!, sig);
    } catch {
      throw new BadRequestException('Webhook signature verification failed');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const reservationId = session.metadata?.reservationId;
      if (reservationId) {
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'reserved',
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent ?? session.id,
          },
        });
      }
    }

    return { received: true };
  }
}
