import { Controller, Get, Post, Patch, Param, Query, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MembersService } from './members.service';
import { TenantId } from '../auth/tenant-id.decorator';

@Controller('admin/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('name') name?: string,
    @Query('grade') grade?: string,
    @Query('gender') gender?: string,
  ) {
    return this.membersService.findAll(tenantId, { name, grade, gender });
  }

  @Get('export')
  async exportCsv(@TenantId() tenantId: string, @Res() res: Response) {
    const csv = await this.membersService.exportCsv(tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.send('﻿' + csv);
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
  getMessages(@TenantId() tenantId: string, @Param('memberId') memberId: string) {
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
