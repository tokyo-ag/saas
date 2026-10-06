import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { MobileManageGuard } from '../auth/mobile-manage.guard';
import { TenantId } from '../auth/tenant-id.decorator';
import { MobileManageService } from './mobile-manage.service';
import { TenantService } from '../tenant/tenant.service';

@UseGuards(AdminGuard)
@Controller('admin/mobile-manage')
export class MobileManageController {
  constructor(private readonly service: MobileManageService) {}

  @Get('settings')
  getSettings(@TenantId() tenantId: string) {
    return this.service.getSettings(tenantId);
  }

  @Post('link')
  issueLink(@TenantId() tenantId: string) {
    return this.service.issueLink(tenantId);
  }

  @Delete('link')
  revokeLink(@TenantId() tenantId: string) {
    return this.service.revokeLink(tenantId);
  }

  @Patch('settings')
  updateSettings(
    @TenantId() tenantId: string,
    @Body()
    dto: { hideLevel?: boolean; hideLineNotify?: boolean; reserveActionStyle?: 'comiu' | 'line' },
  ) {
    return this.service.updateSettings(tenantId, dto);
  }
}

@Controller('mobile-manage')
export class MobileManagePublicController {
  constructor(private readonly service: MobileManageService) {}

  @Post('verify')
  verify(@Body() body: { token: string }) {
    return this.service.verify(body.token);
  }
}

@UseGuards(MobileManageGuard)
@Controller('mobile-manage')
export class MobileManageSessionController {
  constructor(
    private readonly service: MobileManageService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('display-fields')
  getDisplayFields(@TenantId() tenantId: string) {
    return this.service.getDisplayFields(tenantId);
  }

  @Patch('display-fields')
  updateDisplayFields(
    @TenantId() tenantId: string,
    @Body() dto: { location?: boolean; price?: boolean; capacity?: boolean; description?: boolean },
  ) {
    return this.service.updateDisplayFields(tenantId, dto);
  }

  @Get('reviews')
  listReviews(@TenantId() tenantId: string) {
    return this.tenantService.listTenantReviews(tenantId);
  }

  @Delete('reviews/:reviewId')
  deleteReview(
    @TenantId() tenantId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.tenantService.deleteTenantReview(tenantId, reviewId);
  }
}
