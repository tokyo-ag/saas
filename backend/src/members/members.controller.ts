import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MembersService } from './members.service';

@Controller('admin/members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly config: ConfigService,
  ) {}

  private get tenantId() {
    return this.config.get<string>('TENANT_ID')!;
  }

  @Get()
  findAll(@Query('name') name?: string, @Query('grade') grade?: string, @Query('gender') gender?: string) {
    return this.membersService.findAll(this.tenantId, { name, grade, gender });
  }

  @Get('export')
  async exportCsv(@Res() res: Response) {
    const csv = await this.membersService.exportCsv(this.tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.send('﻿' + csv);
  }

  @Get(':memberId')
  findOne(@Param('memberId') memberId: string) {
    return this.membersService.findOne(this.tenantId, memberId);
  }
}
