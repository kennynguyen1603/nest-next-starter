import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  Res,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';

import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { AllConfigType } from '@/config/config.type';
import { User } from '@/users/domain/user';
import { NullableType } from '@/utils/types/nullable.type';
import { getSecurityContext } from '@/utils/security';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { SessionResponseDto } from './dto/session-response.dto';

import { AuthService } from './auth.service';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from './dto/auth-confirm-email.dto';
import { AuthResetPasswordDto } from './dto/auth-reset-password.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { clearRefreshCookie, setRefreshCookie } from './refresh-cookie.util';

// Brute-force / enumeration targets (credentials, one-time hashes, mail
// triggers) get a tight per-IP budget on top of the global limiter.
const SENSITIVE_THROTTLE = { default: { limit: 5, ttl: 60000 } };
// Refresh runs on every page load and tab, so it needs more headroom.
const REFRESH_THROTTLE = { default: { limit: 30, ttl: 60000 } };

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @Throttle(SENSITIVE_THROTTLE)
  @ApiPublic({ type: LoginResponseDto, summary: 'Login with email/password' })
  @SerializeOptions({ groups: ['me'] })
  @Post('email/login')
  public async login(
    @Body() loginDto: AuthEmailLoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<LoginResponseDto, never> & { message: string }> {
    const { refreshToken, ...result } = await this.service.validateLogin(
      loginDto,
      getSecurityContext(req),
    );
    setRefreshCookie(response, this.configService, refreshToken);
    return result;
  }

  @Throttle(SENSITIVE_THROTTLE)
  @ApiPublic({ summary: 'Register new account' })
  @Post('email/register')
  async register(
    @Body() createUserDto: AuthRegisterLoginDto,
  ): Promise<{ message: string }> {
    return this.service.register(createUserDto);
  }

  @Throttle(SENSITIVE_THROTTLE)
  @ApiPublic({ summary: 'Confirm email address' })
  @Post('email/confirm')
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<{ message: string }> {
    return this.service.confirmEmail(confirmEmailDto.hash);
  }

  @Throttle(SENSITIVE_THROTTLE)
  @ApiPublic({ summary: 'Confirm new email address' })
  @Post('email/confirm/new')
  async confirmNewEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<{ message: string }> {
    return this.service.confirmNewEmail(confirmEmailDto.hash);
  }

  @Throttle(SENSITIVE_THROTTLE)
  @ApiPublic({ summary: 'Request password reset' })
  @Post('forgot/password')
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

  @Throttle(SENSITIVE_THROTTLE)
  @ApiPublic({ summary: 'Reset password with token' })
  @Post('reset/password')
  resetPassword(
    @Body() resetPasswordDto: AuthResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.service.resetPassword(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  // @ApiOkResponse overrides the empty schema that @ApiAuth adds by default.
  // We cannot pass type:User directly to @ApiAuth because Serialize(User) strips
  // group-restricted @Expose fields (email/provider/socialId) before
  // ClassSerializerInterceptor can restore them via SerializeOptions groups.
  @ApiOkResponse({ type: User })
  @ApiAuth({ summary: 'Get current user profile' })
  @SerializeOptions({ groups: ['me'] })
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  public me(
    @Request() request: { user: JwtPayloadType },
  ): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @Throttle(REFRESH_THROTTLE)
  @ApiAuth({ type: RefreshResponseDto, summary: 'Refresh access token' })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  public async refresh(
    @Request() request: { user: JwtRefreshPayloadType },
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponseDto> {
    const { refreshToken, ...result } = await this.service.refreshToken({
      sessionId: request.user.sessionId,
      hash: request.user.hash,
    });
    setRefreshCookie(response, this.configService, refreshToken);
    return result;
  }

  @ApiAuth({ summary: 'Logout current session' })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('logout')
  public async logout(
    @Request() request: { user: JwtRefreshPayloadType },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    clearRefreshCookie(response, this.configService);
    return this.service.logout({ sessionId: request.user.sessionId });
  }

  // Same reason as GET /me — see comment above.
  @ApiOkResponse({ type: User })
  @ApiAuth({ summary: 'Update current user profile' })
  @SerializeOptions({ groups: ['me'] })
  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  public update(
    @Request() request: { user: JwtPayloadType },
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiAuth({ summary: 'Delete account' })
  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  public delete(
    @Request() request: { user: JwtPayloadType },
  ): Promise<{ message: string }> {
    return this.service.softDelete(request.user.id);
  }

  @ApiAuth({ summary: 'List active sessions' })
  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  public async sessions(
    @Request() request: { user: JwtPayloadType },
  ): Promise<SessionResponseDto[]> {
    return this.service.getSessions(request.user.id, request.user.sessionId);
  }

  @ApiAuth({ summary: 'Revoke a specific session' })
  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  public async revokeSession(
    @Request() request: { user: JwtPayloadType },
    @Param('id') sessionId: string,
  ): Promise<{ message: string }> {
    return this.service.revokeSession(request.user.id, sessionId);
  }

  @ApiAuth({ summary: 'Revoke all other sessions' })
  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions')
  public async revokeAllOtherSessions(
    @Request() request: { user: JwtPayloadType },
  ): Promise<{ message: string }> {
    return this.service.revokeAllOtherSessions(
      request.user.id,
      request.user.sessionId,
    );
  }
}
