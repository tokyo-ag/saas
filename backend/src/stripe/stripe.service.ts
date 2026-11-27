import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  getClient(secretKey: string) {
    return new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
  }

  async createCheckoutSession(
    secretKey: string,
    opts: {
      eventTitle: string;
      price: number;
      reservationId: string;
      tenantId: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const stripe = this.getClient(secretKey);
    return stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: opts.eventTitle },
            unit_amount: opts.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: { reservationId: opts.reservationId, tenantId: opts.tenantId },
    });
  }

  async createPaymentLink(
    secretKey: string,
    opts: {
      label: string;
      amount: number;
      tenantId: string;
    },
  ) {
    const stripe = this.getClient(secretKey);
    // Payment Links API does not support inline price_data; must pre-create Product + Price
    const product = await stripe.products.create({ name: opts.label });
    const price = await stripe.prices.create({
      currency: 'jpy',
      unit_amount: opts.amount,
      product: product.id,
    });
    return stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { tenantId: opts.tenantId },
    });
  }

  constructEvent(webhookSecret: string, payload: Buffer, signature: string) {
    const stripe = new Stripe('dummy', { apiVersion: '2026-04-22.dahlia' });
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
