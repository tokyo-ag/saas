import { Controller, Get, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsString, IsNotEmpty } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { PushService } from './push.service';
import { TenantId } from '../auth/tenant-id.decorator';

class SubscribeDto {
  @IsString() @IsNotEmpty() endpoint: string;
  @IsString() @IsNotEmpty() p256dh: string;
  @IsString() @IsNotEmpty() auth: string;
}

class UnsubscribeDto {
  @IsString() @IsNotEmpty() endpoint: string;
}

@UseGuards(AdminGuard)
@Controller('admin/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  subscribe(@TenantId() tenantId: string, @Body() dto: SubscribeDto) {
    return this.pushService.subscribe(tenantId, dto.endpoint, dto.p256dh, dto.auth);
  }

  @Delete('subscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.pushService.unsubscribe(dto.endpoint);
  }
}
