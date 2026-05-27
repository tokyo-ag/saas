import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { Plan, ReservationStatus } from '@prisma/client';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';

type StripeEvent = ReturnType<StripeService['constructEvent']>;

@Controller('stripe-webhook')
export class StripeWebhookController {
  constructor(
    private stripe: StripeService,
    private prisma: PrismaService,
  ) {}

  @Post('billing')
  @HttpCode(200)
  async handleBillingWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
    if (!webhookSecret)
      throw new BadRequestException('Billing webhook not configured');

    let event: StripeEvent;
    try {
      const stripe = new Stripe(process.env.STRIPE_BILLING_SECRET_KEY || '', {
        apiVersion: '2026-04-22.dahlia',
      });
      event = stripe.webhooks.constructEvent(req.rawBody!, sig, webhookSecret);
    } catch {
      throw new BadRequestException(
        'Billing webhook signature verification failed',
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        mode?: string | null;
        metadata?: Record<string, string> | null;
        customer?: string | null;
        subscription?: string | null;
      };
      if (session.mode === 'subscription') {
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan as Plan | undefined;
        if (tenantId && plan) {
          await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan,
              planStartedAt: new Date(),
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            },
          });
        }
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as {
        customer?: string | { id: string } | null;
      };
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
      if (customerId) {
        await this.prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { planStartedAt: new Date() },
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as {
        customer: string | { id: string };
      };
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      if (customerId) {
        await this.prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: Plan.free, stripeSubscriptionId: null },
        });
      }
    }

    return { received: true };
  }

  @Post(':tenantId')
  @HttpCode(200)
  async handleWebhook(
    @Param('tenantId') tenantId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant?.stripeWebhookSecret)
      throw new BadRequestException('Webhook not configured');

    let event: StripeEvent;
    try {
      event = this.stripe.constructEvent(
        tenant.stripeWebhookSecret,
        req.rawBody!,
        sig,
      );
    } catch {
      throw new BadRequestException('Webhook signature verification failed');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: Record<string, string> | null;
        payment_intent?: string | null;
        id: string;
      };
      const reservationId = session.metadata?.reservationId;
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (reservationId && uuidRe.test(reservationId)) {
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.reserved,
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent ?? session.id,
          },
        });
      }
    }

    return { received: true };
  }
}
