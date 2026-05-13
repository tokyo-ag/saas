import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { TenantService, UpdateTenantDto } from './tenant.service';
import { TenantId } from '../auth/tenant-id.decorator';

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

  @Post('sync-line-profile')
  syncLineProfile(@TenantId() tenantId: string) {
    return this.tenantService.syncLineProfile(tenantId);
  }
}
