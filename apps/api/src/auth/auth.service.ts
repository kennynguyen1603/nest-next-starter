import crypto from 'crypto';
import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import ms from 'ms';
import { I18nContext, I18nService } from 'nestjs-i18n';

import { AllConfigType } from '@/config/config.type';
import { FILE_UPLOAD_SERVICE } from '@/files/infrastructure/uploader/uploader.interface';
import type { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';
import { EmailQueueService } from '@/worker/queues/email/email.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RoleEnum } from '@/roles/roles.enum';
import { PermissionEnum } from '@/roles/permissions.enum';
import { RolesService } from '@/roles/roles.service';

import { Session } from '@/session/domain/session';
import { SessionService } from '@/session/session.service';
import { SocialInterface } from '@/social/interfaces/social.interface';

import { UserStatus } from '@/users/user-status.enum';
import { User } from '@/users/domain/user';
import { UsersService } from '@/users/users.service';
import { NullableType } from '@/utils/types/nullable.type';

import { AuthProvidersEnum } from './auth-providers.enum';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly emailQueueService: EmailQueueService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly rolesService: RolesService,
    private readonly i18n: I18nService,
    @Inject(FILE_UPLOAD_SERVICE)
    private readonly fileUploadService: IFileUploadService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  private lang(): string {
    return I18nContext.current()?.lang ?? 'en';
  }

  private t(key: string): string {
    return this.i18n.t(key, { lang: this.lang() });
  }

  async validateLogin(
    loginDto: AuthEmailLoginDto,
  ): Promise<LoginResponseDto & { refreshToken: string; message: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      this.logger.warn(
        { email: loginDto.email },
        'Login failed: email not found',
      );
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { email: this.t('auth.EMAIL_NOT_FOUND') },
      });
    }

    if ((user.provider as AuthProvidersEnum) !== AuthProvidersEnum.EMAIL) {
      this.logger.warn(
        { userId: user.id, provider: user.provider },
        'Login failed: social account attempted email login',
      );
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { email: this.t('auth.CANNOT_LOGIN_WITH_SOCIAL') },
      });
    }

    if (!user.password) {
      this.logger.warn({ userId: user.id }, 'Login failed: no password set');
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { password: this.t('auth.INCORRECT_PASSWORD') },
      });
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      this.logger.warn({ userId: user.id }, 'Login failed: incorrect password');
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { password: this.t('auth.INCORRECT_PASSWORD') },
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({ user, hash });

    const roleNames = (user.roles ?? []).map((r) => r.name);
    const permissions =
      await this.rolesService.getPermissionsForRoles(roleNames);

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      roles: roleNames,
      permissions,
      sessionId: session.id,
      hash,
    });

    this.logger.info(
      { userId: user.id, sessionId: session.id, roles: roleNames },
      'User logged in',
    );

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
      message: this.t('auth.LOGIN_SUCCESS'),
    };
  }

  async validateSocialLogin(
    authProvider: string,
    socialData: SocialInterface,
  ): Promise<LoginResponseDto & { refreshToken: string; message: string }> {
    let user: NullableType<User> = null;
    const socialEmail = socialData.email?.toLowerCase();
    let userByEmail: NullableType<User> = null;

    if (socialEmail) {
      userByEmail = await this.usersService.findByEmail(socialEmail);
    }

    if (socialData.id) {
      user = await this.usersService.findBySocialIdAndProvider({
        socialId: socialData.id,
        provider: authProvider,
      });
    }

    if (user) {
      if (socialEmail && !userByEmail) {
        user.email = socialEmail;
      }
      await this.usersService.update(user.id, user);
    } else if (userByEmail) {
      user = userByEmail;
    } else if (socialData.id) {
      let photoDto: { id: string } | undefined;
      if (socialData.photoUrl) {
        try {
          const res = await fetch(socialData.photoUrl);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            const contentType = res.headers.get('content-type') ?? 'image/jpeg';
            const ext = contentType.split('/')[1]?.split('+')[0] ?? 'jpg';
            const file = await this.fileUploadService.uploadFromBuffer(buffer, {
              filename: `avatar.${ext}`,
              mimetype: contentType,
            });
            photoDto = { id: file.id };
          }
        } catch {
          this.logger.warn(
            { provider: authProvider, socialId: socialData.id },
            'Failed to download social avatar — proceeding without photo',
          );
        }
      }

      user = await this.usersService.create({
        email: socialEmail ?? null,
        firstName: socialData.firstName ?? null,
        lastName: socialData.lastName ?? null,
        socialId: socialData.id,
        provider: authProvider,
        photo: photoDto,
        roles: [{ name: RoleEnum.USER }],
        status: UserStatus.ACTIVE,
      });

      this.logger.info(
        { userId: user.id, provider: authProvider },
        'New social user created',
      );

      user = await this.usersService.findById(user.id);
    }

    if (!user) {
      this.logger.warn(
        { provider: authProvider, socialId: socialData.id },
        'Social login failed: user not found after lookup',
      );
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { user: this.t('auth.USER_NOT_FOUND') },
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({ user, hash });

    const roleNames = (user.roles ?? []).map((r) => r.name);
    const permissions =
      await this.rolesService.getPermissionsForRoles(roleNames);

    const {
      token: jwtToken,
      refreshToken,
      tokenExpires,
    } = await this.getTokensData({
      id: user.id,
      roles: roleNames,
      permissions,
      sessionId: session.id,
      hash,
    });

    this.logger.info(
      {
        userId: user.id,
        sessionId: session.id,
        provider: authProvider,
        roles: roleNames,
      },
      'Social login successful',
    );

    return {
      refreshToken,
      token: jwtToken,
      tokenExpires,
      user,
      message: this.t('auth.LOGIN_SUCCESS'),
    };
  }

  async register(dto: AuthRegisterLoginDto): Promise<{ message: string }> {
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      roles: [{ name: RoleEnum.USER }],
      status: UserStatus.INACTIVE,
    });

    const hash = await this.jwtService.signAsync(
      { confirmEmailUserId: user.id },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    await this.emailQueueService.addEmailVerificationJob({
      email: dto.email,
      hash,
    });

    this.logger.info(
      { userId: user.id },
      'User registered — verification email queued',
    );

    return { message: this.t('auth.REGISTER_SUCCESS') };
  }

  async confirmEmail(hash: string): Promise<{ message: string }> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });
      userId = jwtData.confirmEmailUserId;
    } catch {
      this.logger.warn('Email confirmation failed: invalid or expired hash');
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { hash: this.t('auth.INVALID_HASH') },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user || user?.status !== UserStatus.INACTIVE) {
      this.logger.warn(
        { userId },
        'Email confirmation failed: user not found or already active',
      );
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: this.t('auth.USER_NOT_FOUND'),
      });
    }

    user.status = UserStatus.ACTIVE;
    await this.usersService.update(user.id, user);

    this.logger.info(
      { userId: user.id },
      'Email confirmed — account activated',
    );
    return { message: this.t('auth.EMAIL_CONFIRM_SUCCESS') };
  }

  async confirmNewEmail(hash: string): Promise<{ message: string }> {
    let userId: User['id'];
    let newEmail: User['email'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });
      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { hash: this.t('auth.INVALID_HASH') },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: this.t('auth.USER_NOT_FOUND'),
      });
    }

    user.email = newEmail;
    user.status = UserStatus.ACTIVE;
    await this.usersService.update(user.id, user);

    return { message: this.t('auth.NEW_EMAIL_CONFIRM_SUCCESS') };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.debug(
        { email },
        'Forgot password: email not found (silently ignored)',
      );
      // Security: same message regardless of whether email exists
      return { message: this.t('auth.FORGOT_PASSWORD_SUCCESS') };
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      { forgotUserId: user.id },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.emailQueueService.addResetPasswordJob({
      email,
      hash,
      tokenExpires,
    });

    this.logger.info({ userId: user.id }, 'Password reset email queued');
    return { message: this.t('auth.FORGOT_PASSWORD_SUCCESS') };
  }

  async resetPassword(
    hash: string,
    password: string,
  ): Promise<{ message: string }> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });
      userId = jwtData.forgotUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { hash: this.t('auth.INVALID_HASH') },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { hash: this.t('auth.USER_NOT_FOUND') },
      });
    }

    user.password = password;
    await this.sessionService.deleteByUserId({ userId: user.id });
    await this.usersService.update(user.id, user);

    this.logger.info(
      { userId: user.id },
      'Password reset — all sessions invalidated',
    );
    return { message: this.t('auth.RESET_PASSWORD_SUCCESS') };
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    const currentUser = await this.usersService.findById(userJwtPayload.id);

    if (!currentUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { user: this.t('auth.USER_NOT_FOUND') },
      });
    }

    if (userDto.password) {
      if (!userDto.oldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { oldPassword: this.t('auth.OLD_PASSWORD_INCORRECT') },
        });
      }

      if (!currentUser.password) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { oldPassword: this.t('auth.OLD_PASSWORD_INCORRECT') },
        });
      }

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { oldPassword: this.t('auth.OLD_PASSWORD_INCORRECT') },
        });
      } else {
        await this.sessionService.deleteByUserIdWithExclude({
          userId: currentUser.id,
          excludeSessionId: userJwtPayload.sessionId,
        });
      }
    }

    if (userDto.email && userDto.email !== currentUser.email) {
      const userByEmail = await this.usersService.findByEmail(userDto.email);

      if (userByEmail && userByEmail.id !== currentUser.id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: this.t('auth.EMAIL_ALREADY_EXISTS') },
        });
      }

      const hash = await this.jwtService.signAsync(
        { confirmEmailUserId: currentUser.id, newEmail: userDto.email },
        {
          secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
            infer: true,
          }),
        },
      );

      await this.emailQueueService.addConfirmNewEmailJob({
        email: userDto.email,
        hash,
      });
    }

    delete userDto.email;
    delete userDto.oldPassword;

    await this.usersService.update(userJwtPayload.id, userDto);
    return this.usersService.findById(userJwtPayload.id);
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'>,
  ): Promise<{ token: string; refreshToken: string; tokenExpires: number }> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.updateByHash(
      { id: data.sessionId, hash: data.hash },
      { hash },
    );

    if (!session) {
      this.logger.warn(
        { sessionId: data.sessionId },
        'Token refresh failed: session not found or hash mismatch',
      );
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(session.user.id);

    if (!user?.roles?.length) {
      this.logger.warn(
        { sessionId: data.sessionId, userId: session.user.id },
        'Token refresh failed: user not found or has no roles',
      );
      throw new UnauthorizedException();
    }

    const roleNames = user.roles.map((r) => r.name);
    const permissions =
      await this.rolesService.getPermissionsForRoles(roleNames);

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      roles: roleNames,
      permissions,
      sessionId: session.id,
      hash,
    });

    this.logger.debug(
      { userId: session.user.id, sessionId: session.id },
      'Token refreshed',
    );
    return { token, refreshToken, tokenExpires };
  }

  async softDelete(userId: User['id']): Promise<{ message: string }> {
    await this.usersService.remove(userId);
    this.logger.info({ userId }, 'User account soft-deleted');
    return { message: this.t('auth.DELETE_SUCCESS') };
  }

  async logout(
    data: Pick<JwtRefreshPayloadType, 'sessionId'>,
  ): Promise<{ message: string }> {
    await this.sessionService.deleteById(data.sessionId);
    this.logger.info({ sessionId: data.sessionId }, 'User logged out');
    return { message: this.t('auth.LOGOUT_SUCCESS') };
  }

  private async getTokensData(data: {
    id: User['id'];
    roles: RoleEnum[];
    permissions: PermissionEnum[];
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: data.id,
          roles: data.roles,
          permissions: data.permissions,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        { sessionId: data.sessionId, hash: data.hash },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return { token, refreshToken, tokenExpires };
  }

  createBasicAuthHeaders() {
    const username = this.configService.getOrThrow('auth.basicAuth.username', {
      infer: true,
    });
    const password = this.configService.getOrThrow('auth.basicAuth.password', {
      infer: true,
    });
    const base64Credential = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    return {
      Authorization: `Basic ${base64Credential}`,
    };
  }
}
