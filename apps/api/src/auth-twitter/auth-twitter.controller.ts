import { Body, Controller, Post, Res, SerializeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ms from 'ms';

import { ApiPublic } from '@/decorators/http.decorators';
import { AllConfigType } from '@/config/config.type';
import { AuthService } from '../auth/auth.service';
import { AuthTwitterService } from './auth-twitter.service';
import { AuthTwitterLoginDto } from './dto/auth-twitter-login.dto';
import { LoginResponseDto } from '../auth/dto/login-response.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth/twitter',
  version: '1',
})
export class AuthTwitterController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTwitterService: AuthTwitterService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @ApiPublic({
    type: LoginResponseDto,
    summary: 'Login with X (Twitter) OAuth',
  })
  @SerializeOptions({ groups: ['me'] })
  @Post('login')
  async login(
    @Body() loginDto: AuthTwitterLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const socialData =
      await this.authTwitterService.getProfileByToken(loginDto);
    const { refreshToken, ...result } =
      await this.authService.validateSocialLogin('twitter', socialData);
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
