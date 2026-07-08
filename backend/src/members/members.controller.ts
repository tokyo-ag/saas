import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { MembersService } from './members.service';
import { TenantId } from '../auth/tenant-id.decorator';

@UseGuards(AdminGuard)
@Controller('admin/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('name') name?: string,
    @Query('grade') grade?: string,
    @Query('gender') gender?: string,
    @Query('level') level?: string,
  ) {
    return this.membersService.findAll(tenantId, { name, grade, gender, level });
  }

  @Post('sync-line-profiles')
  syncLineProfiles(@TenantId() tenantId: string) {
    return this.membersService.syncLineProfiles(tenantId);
  }

  @Get('messages/threads')
  getMessageThreads(@TenantId() tenantId: string) {
    return this.membersService.getMessageThreads(tenantId);
  }

  @Get(':memberId')
  findOne(@TenantId() tenantId: string, @Param('memberId') memberId: string) {
    return this.membersService.findOne(tenantId, memberId);
  }

  @Patch(':memberId/block')
  block(@TenantId() tenantId: string, @Param('memberId') memberId: string) {
    return this.membersService.block(tenantId, memberId);
  }

  @Patch(':memberId/unblock')
  unblock(@TenantId() tenantId: string, @Param('memberId') memberId: string) {
    return this.membersService.unblock(tenantId, memberId);
  }

  @Get(':memberId/messages')
  getMessages(
    @TenantId() tenantId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.getMessages(tenantId, memberId);
  }

  @Post(':memberId/messages')
  sendMessage(
    @TenantId() tenantId: string,
    @Param('memberId') memberId: string,
    @Body('content') content: string,
  ) {
    return this.membersService.sendMessage(tenantId, memberId, content);
  }
}
