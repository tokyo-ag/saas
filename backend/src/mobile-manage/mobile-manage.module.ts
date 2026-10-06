import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import {
  MobileManageController,
  MobileManagePublicController,
  MobileManageSessionController,
} from './mobile-manage.controller';
import { MobileManageService } from './mobile-manage.service';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [MobileManageController, MobileManagePublicController, MobileManageSessionController],
  providers: [MobileManageService],
})
export class MobileManageModule {}
