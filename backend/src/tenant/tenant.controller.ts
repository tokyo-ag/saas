import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TenantService, UpdateTenantDto } from './tenant.service';
import { TenantId } from '../auth/tenant-id.decorator';

@UseGuards(AdminGuard)
@Controller('admin/tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  findOne(@TenantId() tenantId: string) {
    return this.tenantService.findOne(tenantId);
  }

  @Put()
  update(@TenantId() tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(tenantId, dto);
  }

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.tenantService.getDashboardStats(tenantId);
  }

  @Get('growth')
  getGrowth(@TenantId() tenantId: string) {
    return this.tenantService.getGrowthData(tenantId);
  }

  @Get('activity')
  getActivity(@TenantId() tenantId: string) {
    return this.tenantService.getActivityFeed(tenantId);
  }

  @Get('support')
  getSupportMessages(@TenantId() tenantId: string) {
    return this.tenantService.getSupportMessages(tenantId);
  }

  @Post('support')
  sendSupportMessage(
    @TenantId() tenantId: string,
    @Body('content') content: string,
  ) {
    return this.tenantService.sendSupportMessage(tenantId, content);
  }

  @Post('billing/checkout')
  billingCheckout(@TenantId() tenantId: string, @Body('plan') plan: string) {
    if (plan !== 'standard' && plan !== 'pro') {
      throw new BadRequestException('plan must be standard or pro');
    }
    return this.tenantService.createBillingCheckout(tenantId, plan);
  }
}
