import {
  Body,
  Controller,
  Post,
  Request,
  Res,
  SerializeOptions,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response } from 'express';
import ms from 'ms';

import { ApiPublic } from '@/decorators/http.decorators';
import { AllConfigType } from '@/config/config.type';
import { getSecurityContext } from '@/utils/security';
import { AuthService } from '../auth/auth.service';
import { AuthGoogleService } from './auth-google.service';
import { AuthGoogleLoginDto } from './dto/auth-google-login.dto';
import { LoginResponseDto } from '../auth/dto/login-response.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth/google',
  version: '1',
})
export class AuthGoogleController {
  constructor(
    private readonly authService: AuthService,
    private readonly authGoogleService: AuthGoogleService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @ApiPublic({ type: LoginResponseDto, summary: 'Login with Google OAuth' })
  @SerializeOptions({ groups: ['me'] })
  @Post('login')
  async login(
    @Body() loginDto: AuthGoogleLoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const socialData = await this.authGoogleService.getProfileByToken(loginDto);
    const { refreshToken, ...result } =
      await this.authService.validateSocialLogin(
        'google',
        socialData,
        getSecurityContext(req),
      );
    const maxAge = Number(
      ms(this.configService.getOrThrow('auth.refreshExpires', { infer: true })),
    );
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure:
        this.configService.getOrThrow('app.nodeEnv', { infer: true }) ===
        'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    });
    return result;
  }
}
