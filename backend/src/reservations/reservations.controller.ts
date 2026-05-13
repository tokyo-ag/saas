import { Controller, Patch, Param, Body } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { ReservationsService } from './reservations.service';
import type { ReservationStatusType } from './reservations.service';
import { TenantId } from '../auth/tenant-id.decorator';

class UpdateStatusDto {
  @IsEnum(['reserved', 'attended', 'cancelled', 'waitlisted', 'waiting_payment'])
  status: ReservationStatusType;
}

@Controller('admin/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Patch(':id/status')
  updateStatus(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.reservationsService.updateStatus(tenantId, id, dto.status);
  }
}
