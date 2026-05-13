import {
  Controller, Get, Post, Put, Delete, Param, Body, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { TenantId } from '../auth/tenant-id.decorator';

@Controller('admin/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.eventsService.findAllWithCounts(tenantId);
  }

  @Get(':eventId')
  findOne(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.findOne(tenantId, eventId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(tenantId, dto);
  }

  @Put(':eventId')
  update(@TenantId() tenantId: string, @Param('eventId') eventId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.update(tenantId, eventId, dto);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.remove(tenantId, eventId);
  }

  @Get(':eventId/reservations')
  getReservations(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.getReservations(tenantId, eventId);
  }

  @Post(':eventId/remind')
  sendRemind(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.sendRemind(tenantId, eventId);
  }

  @Get(':eventId/export')
  async exportCsv(@TenantId() tenantId: string, @Param('eventId') eventId: string, @Res() res: Response) {
    const csv = await this.eventsService.exportCsv(tenantId, eventId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}.csv"`);
    res.send('﻿' + csv);
  }
}
