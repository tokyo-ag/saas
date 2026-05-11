import { Controller, Get, Put, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantService, UpdateTenantDto } from './tenant.service';

@Controller('admin/tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly config: ConfigService,
  ) {}

  private get tenantId() {
    return this.config.get<string>('TENANT_ID')!;
  }

  @Get()
  findOne() {
    return this.tenantService.findOne(this.tenantId);
  }

  @Put()
  update(@Body() dto: UpdateTenantDto) {
    return this.tenantService.update(this.tenantId, dto);
  }

  @Get('stats')
  async getStats() {
    const memberCount = await this.tenantService.getMemberCount(this.tenantId);
    return { memberCount };
  }
}
