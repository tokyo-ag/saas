import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('admin/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly config: ConfigService,
  ) {}

  private get tenantId() {
    return this.config.get<string>('TENANT_ID')!;
  }

  @Get()
  findAll() {
    return this.eventsService.findAllWithCounts(this.tenantId);
  }

  @Get(':eventId')
  findOne(@Param('eventId') eventId: string) {
    return this.eventsService.findOne(this.tenantId, eventId);
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(this.tenantId, dto);
  }

  @Put(':eventId')
  update(@Param('eventId') eventId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.update(this.tenantId, eventId, dto);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('eventId') eventId: string) {
    return this.eventsService.remove(this.tenantId, eventId);
  }

  @Get(':eventId/reservations')
  getReservations(@Param('eventId') eventId: string) {
    return this.eventsService.getReservations(this.tenantId, eventId);
  }

  @Post(':eventId/remind')
  sendRemind(@Param('eventId') eventId: string) {
    return this.eventsService.sendRemind(this.tenantId, eventId);
  }

  @Get(':eventId/export')
  async exportCsv(@Param('eventId') eventId: string, @Res() res: Response) {
    const csv = await this.eventsService.exportCsv(this.tenantId, eventId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}.csv"`);
    res.send('﻿' + csv);
  }
}
