import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AdminOrMobileManageGuard } from '../auth/admin-or-mobile-manage.guard';
import { TenantId } from '../auth/tenant-id.decorator';
import { ComiuPayService, CreatePaymentLinkDto } from './comiu-pay.service';

@UseGuards(AdminOrMobileManageGuard)
@Controller('admin/comiu-pay')
export class ComiuPayController {
  constructor(private readonly comiuPayService: ComiuPayService) {}

  @Get('links')
  listLinks(@TenantId() tenantId: string) {
    return this.comiuPayService.listLinks(tenantId);
  }

  @Post('links')
  createLink(@TenantId() tenantId: string, @Body() dto: CreatePaymentLinkDto) {
    return this.comiuPayService.createLink(tenantId, dto);
  }

  @Patch('links/:linkId/deactivate')
  @HttpCode(200)
  deactivateLink(
    @TenantId() tenantId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.comiuPayService.deactivateLink(tenantId, linkId);
  }

  @Get('payments')
  listPayments(@TenantId() tenantId: string) {
    return this.comiuPayService.listPayments(tenantId);
  }
}
