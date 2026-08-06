import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  LiffService,
  CreateReservationDto,
  SubmitReviewDto,
  SendMessageDto,
} from './liff.service';
import { LiffGuard } from '../auth/liff.guard';
import { LiffUser } from '../auth/liff-user.decorator';

// /api/liff/:tenantId/... という URL で受け付ける
@Controller('liff/:tenantId')
export class LiffController {
  constructor(private readonly liffService: LiffService) {}

  // ---- 認証不要（公開） ----

  @Get()
  getTenantInfo(@Param('tenantId') tenantId: string) {
    return this.liffService.getTenantInfo(tenantId);
  }

  @Post('access')
  recordAccess(@Param('tenantId') tenantId: string) {
    return this.liffService.recordAccess(tenantId);
  }

  @Get('events')
  getEvents(@Param('tenantId') tenantId: string) {
    return this.liffService.getEvents(tenantId);
  }

  @Get('activity')
  getRecentActivity(@Param('tenantId') tenantId: string) {
    return this.liffService.getRecentActivity(tenantId);
  }

  @UseGuards(LiffGuard)
  @Get('events/with-friends')
  getEventsWithFriends(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getEvents(tenantId, lineUserId);
  }

  @Get('events/:eventId')
  getEvent(
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.liffService.getEvent(tenantId, eventId);
  }

  @Get('events/:eventId/reviews')
  getPublishedReviews(
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.liffService.getPublishedReviews(tenantId, eventId);
  }

  @Get('members/:memberId')
  getMemberProfile(
    @Param('tenantId') tenantId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.liffService.getMemberProfile(tenantId, memberId);
  }

  // ---- 認証必須（LINEトークン検証） ----

  @UseGuards(LiffGuard)
  @Get('events/:eventId/my-reservation')
  getMyReservation(
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getMyReservation(tenantId, eventId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Get('my-reservations')
  getMyReservations(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getMyReservations(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Get('events/:eventId/my-review')
  getMyReview(
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getMyReview(tenantId, eventId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Post('events/:eventId/reviews')
  submitReview(
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
    @LiffUser() lineUserId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    dto.lineUserId = lineUserId;
    return this.liffService.submitReview(tenantId, eventId, dto);
  }

  @UseGuards(LiffGuard)
  @Post('reservations')
  createReservation(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() dto: CreateReservationDto,
  ) {
    dto.lineUserId = lineUserId;
    return this.liffService.createReservation(tenantId, dto);
  }

  @UseGuards(LiffGuard)
  @Delete('reservations/:reservationId')
  cancelReservation(
    @Param('tenantId') tenantId: string,
    @Param('reservationId') reservationId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.cancelReservation(
      tenantId,
      reservationId,
      lineUserId,
    );
  }

  @UseGuards(LiffGuard)
  @Post('join')
  joinTenant(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() body: { lineDisplayName?: string; linePictureUrl?: string },
  ) {
    return this.liffService.joinTenant(
      tenantId,
      lineUserId,
      body.lineDisplayName,
      body.linePictureUrl,
    );
  }

  @UseGuards(LiffGuard)
  @Get('profile')
  getProfile(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getProfile(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Get('line-notification-link')
  getLineNotificationLink(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getLineNotificationLink(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Post('line-notification-link/code')
  createLineNotificationLinkCode(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.createLineNotificationLinkCode(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Patch('profile')
  updateProfile(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() body: { name: string; grade: string; gender: string },
  ) {
    return this.liffService.updateProfile(tenantId, lineUserId, body);
  }

  @UseGuards(LiffGuard)
  @Patch('profile/line')
  syncLineProfile(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() body: { lineDisplayName?: string; linePictureUrl?: string },
  ) {
    return this.liffService.syncLineProfile(tenantId, lineUserId, body);
  }

  @UseGuards(LiffGuard)
  @Patch('profile/settings')
  updateSettings(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() body: { showEventsToConnections: boolean },
  ) {
    return this.liffService.updateSettings(
      tenantId,
      lineUserId,
      body.showEventsToConnections,
    );
  }

  @UseGuards(LiffGuard)
  @Post('connections')
  createConnection(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() body: { targetMemberId: string },
  ) {
    return this.liffService.createConnection(
      tenantId,
      lineUserId,
      body.targetMemberId,
    );
  }

  @UseGuards(LiffGuard)
  @Get('connections')
  getConnections(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getConnections(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Get('connections/:connectionId/messages')
  getMessages(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getMessages(tenantId, connectionId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Post('connections/:connectionId/messages')
  sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @LiffUser() lineUserId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.liffService.sendMessage(
      tenantId,
      connectionId,
      lineUserId,
      dto.content,
    );
  }

  @UseGuards(LiffGuard)
  @Get('notifications')
  getNotifications(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getNotifications(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Patch('notifications/:notificationId/read')
  markRead(
    @Param('tenantId') tenantId: string,
    @Param('notificationId') notificationId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.markNotificationRead(
      tenantId,
      notificationId,
      lineUserId,
    );
  }

  @UseGuards(LiffGuard)
  @Patch('notifications/read-all')
  markAllRead(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.markAllNotificationsRead(tenantId, lineUserId);
  }

  @UseGuards(LiffGuard)
  @Get('support')
  getSupportMessages(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
  ) {
    return this.liffService.getSupportMessages(lineUserId);
  }

  @UseGuards(LiffGuard)
  @Post('support')
  sendSupportMessage(
    @Param('tenantId') tenantId: string,
    @LiffUser() lineUserId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.liffService.sendSupportMessage(
      lineUserId,
      tenantId,
      dto.content,
    );
  }
}
