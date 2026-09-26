import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsNotEmpty() @IsString() orgName: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}

class ReconfirmDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}

class VerifyTwoFactorDto {
  @IsString() @IsNotEmpty() pendingToken: string;
  @IsString() @IsNotEmpty() code: string;
}

class ResendTwoFactorDto {
  @IsString() @IsNotEmpty() pendingToken: string;
}

class LineLoginPublicDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() redirectUri: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() @IsNotEmpty() token: string;
  @IsString() @MinLength(8) password: string;
}

class SetEmailPasswordDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.orgName);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('verify-2fa')
  verifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.authService.verifyTwoFactor(dto.pendingToken, dto.code);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('resend-2fa')
  resendTwoFactor(@Body() dto: ResendTwoFactorDto) {
    return this.authService.resendTwoFactor(dto.pendingToken);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reconfirm')
  @UseGuards(AdminGuard)
  reconfirm(
    @Req() req: Request & { user: { tenantId: string; accountId: string } },
    @Body() dto: ReconfirmDto,
  ) {
    return this.authService.reconfirmPassword(
      req.user.tenantId,
      req.user.accountId,
      dto.email,
      dto.password,
    );
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('set-email-password')
  @UseGuards(AdminGuard)
  setEmailPassword(
    @Req() req: Request & { user: { tenantId: string; accountId: string } },
    @Body() dto: SetEmailPasswordDto,
  ) {
    return this.authService.setEmailPassword(
      req.user.tenantId,
      req.user.accountId,
      dto.email,
      dto.password,
    );
  }

  @Post('resend-verification')
  @UseGuards(AdminGuard)
  resendVerification(
    @Req() req: Request & { user: { tenantId: string; accountId: string } },
  ) {
    return this.authService.resendVerificationEmail(
      req.user.tenantId,
      req.user.accountId,
    );
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('resend-verification-by-email')
  resendVerificationByEmail(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerificationEmailByEmail(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post('line-login')
  async lineLoginPublic(@Body() dto: LineLoginPublicDto) {
    const channelId = this.config.get<string>('LINE_LOGIN_CHANNEL_ID');
    const channelSecret = this.config.get<string>('LINE_LOGIN_CHANNEL_SECRET');
    if (!channelId || !channelSecret)
      throw new BadRequestException('LINE Login未設定');

    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: dto.code,
        redirect_uri: dto.redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    if (!tokenRes.ok) throw new BadRequestException('LINE Loginに失敗しました');
    const tokens = (await tokenRes.json()) as {
      id_token: string;
      access_token: string;
    };

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok)
      throw new BadRequestException('プロフィール取得に失敗しました');
    const profile = (await profileRes.json()) as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    return {
      idToken: tokens.id_token,
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  getMe(
    @Req() req: Request & { user: { tenantId: string; accountId: string } },
  ) {
    return this.authService.getMe(req.user.tenantId, req.user.accountId);
  }
}
