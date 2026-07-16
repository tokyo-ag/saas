import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperadminGuard } from '../auth/superadmin.guard';
import {
  SuperadminService,
  CreateTenantDto,
  UpdateTenantDto,
  BanUserDto,
  UpdateOfficialSiteDto,
  UpsertOfficialArticleDto,
  UpsertAreaHubSettingDto,
} from './superadmin.service';

@UseGuards(SuperadminGuard)
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly service: SuperadminService) {}

  @Get('tenants')
  list() {
    return this.service.listTenants();
  }

  @Post('tenants')
  create(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Put('tenants/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.updateTenant(id, dto);
  }

  @Patch('tenants/:id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivateTenant(id);
  }

  @Patch('tenants/:id/restore')
  restore(@Param('id') id: string) {
    return this.service.restoreTenant(id);
  }

  @Patch('tenants/:id/ban')
  ban(@Param('id') id: string) {
    return this.service.banTenant(id);
  }

  @Delete('tenants/:id')
  purge(@Param('id') id: string) {
    return this.service.deleteTenant(id);
  }

  @Get('tenants/:id/impersonate')
  impersonate(@Param('id') id: string) {
    return this.service.impersonate(id);
  }

  @Get('banned-users')
  listBanned() {
    return this.service.listBannedUsers();
  }

  @Post('banned-users')
  banUser(@Body() dto: BanUserDto) {
    return this.service.banUser(dto);
  }

  @Delete('banned-users/:lineUserId')
  unbanUser(@Param('lineUserId') lineUserId: string) {
    return this.service.unbanUser(lineUserId);
  }

  @Get('errors')
  getErrorLogs() {
    return this.service.getErrorLogs();
  }

  @Delete('errors')
  clearErrorLogs() {
    return this.service.clearErrorLogs();
  }

  @Get('support')
  getSupportThreads() {
    return this.service.getSupportThreads();
  }

  @Get('support/:lineUserId')
  getSupportMessages(@Param('lineUserId') lineUserId: string) {
    return this.service.getSupportMessages(lineUserId);
  }

  @Post('support/:lineUserId/reply')
  replySupportMessage(
    @Param('lineUserId') lineUserId: string,
    @Body('content') content: string,
  ) {
    return this.service.replySupportMessage(lineUserId, content);
  }

  @Get('official-site')
  getOfficialSite() {
    return this.service.getOfficialSite();
  }

  @Put('official-site')
  updateOfficialSite(@Body() dto: UpdateOfficialSiteDto) {
    return this.service.updateOfficialSite(dto);
  }

  @Get('official-articles')
  listOfficialArticles() {
    return this.service.listOfficialArticles();
  }

  @Get('area-hub-summary')
  getAreaHubSummary() {
    return this.service.getAreaHubSummary();
  }

  @Get('area-hub-settings')
  getAreaHubSetting(
    @Query('category') category: string,
    @Query('area') area?: string,
  ) {
    return this.service.getAreaHubSetting(category, area ?? '');
  }

  @Put('area-hub-settings')
  upsertAreaHubSetting(
    @Query('category') category: string,
    @Query('area') area: string | undefined,
    @Body() dto: UpsertAreaHubSettingDto,
  ) {
    return this.service.upsertAreaHubSetting(category, area ?? '', dto);
  }

  @Post('official-articles')
  createOfficialArticle(@Body() dto: UpsertOfficialArticleDto) {
    return this.service.createOfficialArticle(dto);
  }

  @Put('official-articles/:id')
  updateOfficialArticle(
    @Param('id') id: string,
    @Body() dto: UpsertOfficialArticleDto,
  ) {
    return this.service.updateOfficialArticle(id, dto);
  }

  @Delete('official-articles/:id')
  deleteOfficialArticle(@Param('id') id: string) {
    return this.service.deleteOfficialArticle(id);
  }
}
