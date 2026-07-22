import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TenantId } from '../auth/tenant-id.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { BlogService, UpsertBlogPostDto } from './blog.service';

@UseGuards(AdminGuard)
@Controller('admin/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.blogService.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: UpsertBlogPostDto) {
    return this.blogService.create(tenantId, dto);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.blogService.get(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertBlogPostDto,
  ) {
    return this.blogService.update(tenantId, id, dto);
  }

  @Put(':id/regenerate-slug')
  regenerateSlug(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.blogService.regenerateSlug(tenantId, id);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.blogService.remove(tenantId, id);
  }
}
