import { Controller, Patch, Param, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReservationsService } from './reservations.service';
import type { ReservationStatusType } from './reservations.service';
import { IsEnum } from 'class-validator';

class UpdateStatusDto {
  @IsEnum(['reserved', 'attended', 'cancelled', 'waitlisted', 'waiting_payment'])
  status: ReservationStatusType;
}

@Controller('admin/reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly config: ConfigService,
  ) {}

  private get tenantId() {
    return this.config.get<string>('TENANT_ID')!;
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.reservationsService.updateStatus(this.tenantId, id, dto.status);
  }
}
