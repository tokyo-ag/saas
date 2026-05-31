import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
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

class LineCompleteDto {
  @IsString() lineToken: string;
  @IsNotEmpty() @IsString() orgName: string;
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
  constructor(private authService: AuthService) {}

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

  @Get('line')
  lineStart(@Res() res: Response) {
    const url = this.authService.getLineAuthUrl();
    res.redirect(url);
  }

  @Get('line/callback')
  async lineCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      res.redirect(this.authService.getLineFailureRedirectUrl(error));
      return;
    }

    try {
      const { redirectUrl } = await this.authService.handleLineCallback(
        code,
        state,
      );
      res.redirect(redirectUrl);
    } catch {
      res.redirect(this.authService.getLineFailureRedirectUrl());
    }
  }

  @Post('line/complete')
  completeLineRegistration(@Body() dto: LineCompleteDto) {
    return this.authService.completeLineRegistration(
      dto.lineToken,
      dto.orgName,
    );
  }

  @Get('me')
  @UseGuards(AdminGuard)
  getMe(
    @Req() req: Request & { user: { tenantId: string; accountId: string } },
  ) {
    return this.authService.getMe(req.user.tenantId, req.user.accountId);
  }
}
