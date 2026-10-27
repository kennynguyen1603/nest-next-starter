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

import { ApiPublic } from '@/decorators/http.decorators';
import { AllConfigType } from '@/config/config.type';
import { getSecurityContext } from '@/utils/security';
import { AuthService } from '../auth/auth.service';
import { AuthFacebookService } from './auth-facebook.service';
import { AuthFacebookLoginDto } from './dto/auth-facebook-login.dto';
import { LoginResponseDto } from '../auth/dto/login-response.dto';
import { setRefreshCookie } from '../auth/refresh-cookie.util';

@ApiTags('Auth')
@Controller({
  path: 'auth/facebook',
  version: '1',
})
export class AuthFacebookController {
  constructor(
    private readonly authService: AuthService,
    private readonly authFacebookService: AuthFacebookService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @ApiPublic({ type: LoginResponseDto, summary: 'Login with Facebook OAuth' })
  @SerializeOptions({ groups: ['me'] })
  @Post('login')
  async login(
    @Body() loginDto: AuthFacebookLoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const socialData =
      await this.authFacebookService.getProfileByToken(loginDto);
    const { refreshToken, ...result } =
      await this.authService.validateSocialLogin(
        'facebook',
        socialData,
        getSecurityContext(req),
      );
    setRefreshCookie(response, this.configService, refreshToken);
    return result;
  }
}
