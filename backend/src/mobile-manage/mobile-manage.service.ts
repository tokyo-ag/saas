import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class MobileManageService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000')
      .trim()
      .replace(/\/$/, '');
  }

  private buildLinkUrl(token: string): string {
    return `${this.getFrontendUrl()}/mobile-manage/${token}`;
  }

  private async parseFooterSettings(tenantId: string): Promise<Record<string, any>> {
    const page = await this.prisma.publicPage.findFirst({
      where: { tenantId },
      select: { footerText: true },
    });
    try {
      const parsed = JSON.parse(page?.footerText ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async patchFooterSettings(tenantId: string, patch: Record<string, unknown>) {
    const page = await this.prisma.publicPage.findFirst({
      where: { tenantId },
      select: { id: true, footerText: true },
    });
    if (!page) return;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(page.footerText ?? '{}');
    } catch {
      parsed = {};
    }
    Object.assign(parsed, patch);
    await this.prisma.publicPage.update({
      where: { id: page.id },
      data: { footerText: JSON.stringify(parsed) },
    });
  }

  private async getReserveActionStyle(tenantId: string): Promise<'comiu' | 'line'> {
    const parsed = await this.parseFooterSettings(tenantId);
    return parsed.reserveActionStyle === 'line' ? 'line' : 'comiu';
  }

  private async setReserveActionStyle(tenantId: string, style: 'comiu' | 'line') {
    await this.patchFooterSettings(tenantId, { reserveActionStyle: style });
  }

  private normalizeDisplayFields(raw: any) {
    return {
      location: raw?.location !== false,
      price: raw?.price !== false,
      capacity: raw?.capacity === true,
      description: raw?.description !== false,
    };
  }

  async getDisplayFields(tenantId: string) {
    const parsed = await this.parseFooterSettings(tenantId);
    return this.normalizeDisplayFields(parsed.displayFields);
  }

  async updateDisplayFields(
    tenantId: string,
    dto: { location?: boolean; price?: boolean; capacity?: boolean; description?: boolean },
  ) {
    const current = await this.getDisplayFields(tenantId);
    const next = { ...current, ...dto };
    await this.patchFooterSettings(tenantId, { displayFields: next });
    return next;
  }

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        mobileManageToken: true,
        mobileManageHideLevel: true,
        mobileManageHideLineNotify: true,
      },
    });
    if (!tenant) throw new NotFoundException('団体が見つかりません');
    return {
      linkUrl: tenant.mobileManageToken
        ? this.buildLinkUrl(tenant.mobileManageToken)
        : null,
      hideLevel: tenant.mobileManageHideLevel,
      hideLineNotify: tenant.mobileManageHideLineNotify,
      reserveActionStyle: await this.getReserveActionStyle(tenantId),
    };
  }

  async issueLink(tenantId: string) {
    const token = crypto.randomBytes(24).toString('hex');
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { mobileManageToken: token },
    });
    return { linkUrl: this.buildLinkUrl(token) };
  }

  async revokeLink(tenantId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { mobileManageToken: null },
    });
    return { linkUrl: null };
  }

  async updateSettings(
    tenantId: string,
    dto: { hideLevel?: boolean; hideLineNotify?: boolean; reserveActionStyle?: 'comiu' | 'line' },
  ) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.hideLevel !== undefined && { mobileManageHideLevel: dto.hideLevel }),
        ...(dto.hideLineNotify !== undefined && {
          mobileManageHideLineNotify: dto.hideLineNotify,
        }),
      },
    });
    if (dto.reserveActionStyle) {
      await this.setReserveActionStyle(tenantId, dto.reserveActionStyle);
    }
    return this.getSettings(tenantId);
  }

  async verify(token: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { mobileManageToken: token },
      select: {
        id: true,
        code: true,
        name: true,
        lineDisplayName: true,
        linePictureUrl: true,
        iconUrl: true,
        liffEventView: true,
        mobileManageHideLevel: true,
        mobileManageHideLineNotify: true,
        deletedAt: true,
        bannedAt: true,
      },
    });
    if (!tenant || tenant.deletedAt || tenant.bannedAt) {
      throw new NotFoundException('リンクが無効です');
    }
    const accessToken = this.jwtService.sign(
      { tenantId: tenant.id, scope: 'mobile-manage', token },
      { expiresIn: '3650d' },
    );
    return {
      accessToken,
      tenantCode: tenant.code ?? tenant.id,
      tenantName: tenant.name ?? tenant.lineDisplayName ?? '団体',
      tenantIcon: tenant.linePictureUrl ?? tenant.iconUrl ?? null,
      liffEventView: tenant.liffEventView,
      hideLevel: tenant.mobileManageHideLevel,
      hideLineNotify: tenant.mobileManageHideLineNotify,
    };
  }
}
