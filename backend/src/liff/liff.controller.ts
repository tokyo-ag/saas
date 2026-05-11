import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { LiffService, CreateReservationDto } from './liff.service';

// /api/liff/:tenantId/... という URL で受け付ける
@Controller('liff/:tenantId')
export class LiffController {
  constructor(private readonly liffService: LiffService) {}

  @Get('events')
  getEvents(@Param('tenantId') tenantId: string) {
    return this.liffService.getEvents(tenantId);
  }

  @Get('events/:eventId')
  getEvent(@Param('tenantId') tenantId: string, @Param('eventId') eventId: string) {
    return this.liffService.getEvent(tenantId, eventId);
  }

  @Post('reservations')
  createReservation(@Param('tenantId') tenantId: string, @Body() dto: CreateReservationDto) {
    return this.liffService.createReservation(tenantId, dto);
  }

  @Delete('reservations/:reservationId')
  cancelReservation(
    @Param('tenantId') tenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    return this.liffService.cancelReservation(tenantId, reservationId);
  }
}
