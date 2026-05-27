import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { ReservationsService } from './reservations.service';
import { TenantId } from '../auth/tenant-id.decorator';

class UpdateStatusDto {
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}

@UseGuards(AdminGuard)
@Controller('admin/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Patch(':id/status')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.reservationsService.updateStatus(tenantId, id, dto.status);
  }
}
