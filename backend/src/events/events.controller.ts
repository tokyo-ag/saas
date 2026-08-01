import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminOrMobileManageGuard } from '../auth/admin-or-mobile-manage.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { TenantId } from '../auth/tenant-id.decorator';

@UseGuards(AdminOrMobileManageGuard)
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
  update(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.update(tenantId, eventId, dto);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.remove(tenantId, eventId);
  }

  @Get(':eventId/reservations')
  getReservations(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.getReservations(tenantId, eventId);
  }

  @Get(':eventId/reviews')
  getReviews(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.getReviews(tenantId, eventId);
  }

  @Patch(':eventId/reviews/:reviewId')
  updateReview(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: { isPublished: boolean },
  ) {
    return this.eventsService.updateReview(
      tenantId,
      eventId,
      reviewId,
      body.isPublished,
    );
  }

  @Post(':eventId/remind')
  sendRemind(@TenantId() tenantId: string, @Param('eventId') eventId: string) {
    return this.eventsService.sendRemind(tenantId, eventId);
  }

  @Post(':eventId/checkin')
  checkin(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: { memberId: string },
  ) {
    return this.eventsService.checkin(tenantId, eventId, body.memberId);
  }

  @Post(':eventId/message')
  sendMessage(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: { content: string; sendLine: boolean; sendApp: boolean },
  ) {
    return this.eventsService.sendMessage(
      tenantId,
      eventId,
      body.content,
      body.sendLine,
      body.sendApp,
    );
  }

  @Patch(':eventId/roster-share')
  toggleRosterShare(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.eventsService.toggleRosterShare(
      tenantId,
      eventId,
      body.enabled,
    );
  }

  @Get(':eventId/export')
  async exportCsv(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Res() res: Response,
  ) {
    const csv = await this.eventsService.exportCsv(tenantId, eventId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="event-${eventId}.csv"`,
    );
    res.send('﻿' + csv);
  }
}
