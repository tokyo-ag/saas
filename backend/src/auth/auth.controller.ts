import { Controller, Post, Get, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
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

class LineCompleteDto {
  @IsString() lineToken: string;
  @IsNotEmpty() @IsString() orgName: string;
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

  @Get('line')
  lineStart(@Res() res: Response) {
    const url = this.authService.getLineAuthUrl();
    res.redirect(url);
  }

  @Get('line/callback')
  async lineCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.authService.handleLineCallback(code, state);
    res.redirect(redirectUrl);
  }

  @Post('line/complete')
  completeLineRegistration(@Body() dto: LineCompleteDto) {
    return this.authService.completeLineRegistration(dto.lineToken, dto.orgName);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  getMe(@Req() req: Request & { user: { tenantId: string; accountId: string } }) {
    return this.authService.getMe(req.user.tenantId, req.user.accountId);
  }
}
