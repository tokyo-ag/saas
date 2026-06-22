import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TenantId } from '../auth/tenant-id.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { PublicPagesService, UpsertPublicPageDto } from './public-pages.service';

@UseGuards(AdminGuard)
@Controller('admin/public-pages')
export class PublicPagesController {
  constructor(private readonly publicPagesService: PublicPagesService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.publicPagesService.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: UpsertPublicPageDto) {
    return this.publicPagesService.create(tenantId, dto);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.publicPagesService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertPublicPageDto,
  ) {
    return this.publicPagesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.publicPagesService.remove(tenantId, id);
  }
}
