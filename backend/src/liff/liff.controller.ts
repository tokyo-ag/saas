import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { LiffService, CreateReservationDto } from './liff.service';

// /api/liff/:tenantId/... という URL で受け付ける
@Controller('liff/:tenantId')
export class LiffController {
  constructor(private readonly liffService: LiffService) {}

  @Get()
  getTenantInfo(@Param('tenantId') tenantId: string) {
    return this.liffService.getTenantInfo(tenantId);
  }

  @Get('events')
  getEvents(
    @Param('tenantId') tenantId: string,
    @Query('lineUserId') lineUserId?: string,
  ) {
    return this.liffService.getEvents(tenantId, lineUserId);
  }

  @Get('events/:eventId')
  getEvent(@Param('tenantId') tenantId: string, @Param('eventId') eventId: string) {
    return this.liffService.getEvent(tenantId, eventId);
  }

  @Get('events/:eventId/my-reservation')
  getMyReservation(
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.liffService.getMyReservation(tenantId, eventId, lineUserId);
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

  @Get('profile')
  getProfile(@Param('tenantId') tenantId: string, @Query('lineUserId') lineUserId: string) {
    return this.liffService.getProfile(tenantId, lineUserId);
  }

  @Patch('profile')
  updateProfile(
    @Param('tenantId') tenantId: string,
    @Query('lineUserId') lineUserId: string,
    @Body() body: { name: string; grade: string; gender: string },
  ) {
    return this.liffService.updateProfile(tenantId, lineUserId, body);
  }

  @Patch('profile/settings')
  updateSettings(
    @Param('tenantId') tenantId: string,
    @Query('lineUserId') lineUserId: string,
    @Body() body: { showEventsToConnections: boolean },
  ) {
    return this.liffService.updateSettings(tenantId, lineUserId, body.showEventsToConnections);
  }

  @Get('members/:memberId')
  getMemberProfile(@Param('tenantId') tenantId: string, @Param('memberId') memberId: string) {
    return this.liffService.getMemberProfile(tenantId, memberId);
  }

  @Post('connections')
  createConnection(
    @Param('tenantId') tenantId: string,
    @Body() body: { myLineUserId: string; targetMemberId: string },
  ) {
    return this.liffService.createConnection(tenantId, body.myLineUserId, body.targetMemberId);
  }

  @Get('connections')
  getConnections(@Param('tenantId') tenantId: string, @Query('lineUserId') lineUserId: string) {
    return this.liffService.getConnections(tenantId, lineUserId);
  }

  @Get('connections/:connectionId/messages')
  getMessages(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.liffService.getMessages(tenantId, connectionId, lineUserId);
  }

  @Post('connections/:connectionId/messages')
  sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @Body() body: { lineUserId: string; content: string },
  ) {
    return this.liffService.sendMessage(tenantId, connectionId, body.lineUserId, body.content);
  }

  @Get('notifications')
  getNotifications(@Param('tenantId') tenantId: string, @Query('lineUserId') lineUserId: string) {
    return this.liffService.getNotifications(tenantId, lineUserId);
  }

  @Patch('notifications/:notificationId/read')
  markRead(
    @Param('tenantId') tenantId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.liffService.markNotificationRead(tenantId, notificationId);
  }

  @Patch('notifications/read-all')
  markAllRead(@Param('tenantId') tenantId: string, @Query('lineUserId') lineUserId: string) {
    return this.liffService.markAllNotificationsRead(tenantId, lineUserId);
  }

  // 管理者↔メンバー トーク（メンバー側）
  @Get('admin-messages')
  getAdminMessages(
    @Param('tenantId') tenantId: string,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.liffService.getAdminMessages(tenantId, lineUserId);
  }

  @Post('admin-messages')
  sendToAdmin(
    @Param('tenantId') tenantId: string,
    @Body('lineUserId') lineUserId: string,
    @Body('content') content: string,
  ) {
    return this.liffService.sendToAdmin(tenantId, lineUserId, content);
  }

  // サポート（ユーザー↔スーパーアドミン）
  @Get('support')
  getSupportMessages(
    @Param('tenantId') tenantId: string,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.liffService.getSupportMessages(lineUserId);
  }

  @Post('support')
  sendSupportMessage(
    @Param('tenantId') tenantId: string,
    @Body('lineUserId') lineUserId: string,
    @Body('content') content: string,
  ) {
    return this.liffService.sendSupportMessage(lineUserId, tenantId, content);
  }
}
