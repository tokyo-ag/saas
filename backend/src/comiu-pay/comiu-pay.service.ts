import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

export class CreatePaymentLinkDto {
  label: string;
  amount: number;
}

@Injectable()
export class ComiuPayService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {}

  async listLinks(tenantId: string) {
    return this.prisma.paymentLink.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLink(tenantId: string, dto: CreatePaymentLinkDto) {
    if (!dto.label?.trim()) {
      throw new BadRequestException('ラベルを入力してください');
    }
    if (!dto.amount || dto.amount < 1) {
      throw new BadRequestException('金額は1円以上を入力してください');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeSecretKey: true },
    });
    if (!tenant?.stripeSecretKey) {
      throw new BadRequestException(
        'Stripe設定が未完了です。設定 → Stripe決済でAPIキーを登録してください。',
      );
    }

    const link = await this.stripe.createPaymentLink(tenant.stripeSecretKey, {
      label: dto.label.trim(),
      amount: dto.amount,
      tenantId,
    });

    return this.prisma.paymentLink.create({
      data: {
        tenantId,
        label: dto.label.trim(),
        amount: dto.amount,
        stripePaymentLinkId: link.id,
        url: link.url,
      },
    });
  }

  async deactivateLink(tenantId: string, linkId: string) {
    const link = await this.prisma.paymentLink.findFirst({
      where: { id: linkId, tenantId },
    });
    if (!link) throw new BadRequestException('リンクが見つかりません');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeSecretKey: true },
    });
    if (tenant?.stripeSecretKey) {
      const stripe = this.stripe.getClient(tenant.stripeSecretKey);
      await stripe.paymentLinks.update(link.stripePaymentLinkId, {
        active: false,
      });
    }

    return this.prisma.paymentLink.update({
      where: { id: linkId },
      data: { active: false },
    });
  }

  async listPayments(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeSecretKey: true },
    });
    if (!tenant?.stripeSecretKey) return { payments: [], total: 0 };

    const stripe = this.stripe.getClient(tenant.stripeSecretKey);
    const charges = await stripe.charges.list({
      limit: 50,
    });

    const payments = charges.data
      .filter((c) => c.paid && !c.refunded)
      .map((c) => ({
        id: c.id,
        amount: c.amount,
        description: c.description ?? '',
        createdAt: new Date(c.created * 1000).toISOString(),
        status: c.status,
        receiptUrl: c.receipt_url,
      }));

    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    return { payments, total };
  }
}
