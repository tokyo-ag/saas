import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';
import { SuperadminGuard } from './superadmin.guard';
import { MobileManageGuard } from './mobile-manage.guard';
import { AdminOrMobileManageGuard } from './admin-or-mobile-manage.guard';

@Global()
@Module({
  imports: [
    PrismaModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET is required in production');
        }
        return {
          secret: secret ?? 'dev-secret-change-me',
          signOptions: { expiresIn: '30d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard, SuperadminGuard, MobileManageGuard, AdminOrMobileManageGuard],
  exports: [AdminGuard, SuperadminGuard, MobileManageGuard, AdminOrMobileManageGuard, JwtModule],
})
export class AuthModule {}
