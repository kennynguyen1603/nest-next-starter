import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import bcrypt from 'bcryptjs';

import { getLoggerToken } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';
import { SessionService } from '@/session/session.service';
import { RolesService } from '@/roles/roles.service';
import { FILE_UPLOAD_SERVICE } from '@/files/infrastructure/uploader/uploader.interface';
import { EmailQueueService } from '@/worker/queues/email/email.service';
import { CacheService } from '@/shared/cache/cache.service';
import { AuthProvidersEnum } from './auth-providers.enum';
import { UserStatus } from '@/users/user-status.enum';

const mockI18n = { t: jest.fn().mockReturnValue('mocked') };
const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findBySocialIdAndProvider: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};
const mockSessionService = {
  create: jest.fn(),
  deleteById: jest.fn(),
  deleteByUserId: jest.fn(),
  deleteByUserIdWithExclude: jest.fn(),
  updateByHash: jest.fn(),
  enforceSessionLimit: jest.fn().mockResolvedValue(undefined),
};
const mockEmailQueueService = {
  addEmailVerificationJob: jest.fn(),
  addConfirmNewEmailJob: jest.fn(),
  addResetPasswordJob: jest.fn(),
};
const mockFileUploadService = {
  uploadFromBuffer: jest.fn(),
  getFileUrl: jest.fn(),
};
const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('token'),
  verifyAsync: jest.fn(),
};
const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('15m'),
};
const mockRolesService = {
  getPermissionsForRoles: jest.fn().mockResolvedValue([]),
};
const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue({ key: 'cache-key' }),
};
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: I18nService, useValue: mockI18n },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: FILE_UPLOAD_SERVICE, useValue: mockFileUploadService },
        { provide: getLoggerToken(AuthService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateLogin', () => {
    it('throws UnprocessableEntityException when email not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateLogin({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.INVALID_CREDENTIALS',
        expect.any(Object),
      );
    });

    it('throws UnprocessableEntityException when provider is not email', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
        provider: AuthProvidersEnum.GOOGLE,
        password: 'hash',
        roles: [],
      });

      await expect(
        service.validateLogin({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.CANNOT_LOGIN_WITH_SOCIAL',
        expect.any(Object),
      );
    });

    it('throws UnprocessableEntityException when no password is set', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
        provider: AuthProvidersEnum.EMAIL,
        password: null,
        roles: [],
      });

      await expect(
        service.validateLogin({ email: 'x@x.com', password: 'anypass' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.INVALID_CREDENTIALS',
        expect.any(Object),
      );
    });

    it('throws UnprocessableEntityException when password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
        provider: AuthProvidersEnum.EMAIL,
        password: 'wronghash',
        roles: [],
      });

      let thrownError: UnprocessableEntityException | undefined;
      await expect(
        service.validateLogin({ email: 'x@x.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnprocessableEntityException);

      // Error is on 'email' field (not 'password') to prevent user enumeration
      await service
        .validateLogin({ email: 'x@x.com', password: 'wrongpass' })
        .catch((e: UnprocessableEntityException) => {
          thrownError = e;
        });
      expect(thrownError?.getResponse()).toMatchObject({
        errors: { email: 'mocked' },
      });

      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.INVALID_CREDENTIALS',
        expect.any(Object),
      );
    });

    it('returns token data and message on success', async () => {
      const hash = await bcrypt.hash('correctpass', 10);

      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
        provider: AuthProvidersEnum.EMAIL,
        password: hash,
        roles: [{ name: 'user' }],
      });
      mockSessionService.create.mockResolvedValue({
        id: 'session1',
        hash: 'h',
      });
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.validateLogin({
        email: 'x@x.com',
        password: 'correctpass',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('message', 'mocked');
      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.LOGIN_SUCCESS',
        expect.any(Object),
      );
    });
  });

  describe('register', () => {
    it('returns translated message on success', async () => {
      mockUsersService.create.mockResolvedValue({ id: '1', email: 'x@x.com' });
      mockJwtService.signAsync.mockResolvedValue('confirm-token');
      mockEmailQueueService.addEmailVerificationJob.mockResolvedValue(
        undefined,
      );

      const result = await service.register({
        email: 'x@x.com',
        password: 'pass123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toEqual({ message: 'mocked' });
      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.REGISTER_SUCCESS',
        expect.any(Object),
      );
    });
  });

  describe('forgotPassword', () => {
    it('returns success message and skips cache when email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('notfound@x.com');

      expect(result).toEqual({ message: 'mocked' });
      expect(mockEmailQueueService.addResetPasswordJob).not.toHaveBeenCalled();
      // cache must not be touched when email is unknown (anti-enumeration)
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it('sends reset email and sets cooldown when user exists and no cooldown is active', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
      });
      mockCacheService.get.mockResolvedValue(null);
      mockJwtService.signAsync.mockResolvedValue('reset-token');
      mockEmailQueueService.addResetPasswordJob.mockResolvedValue(undefined);

      const result = await service.forgotPassword('x@x.com');

      expect(result).toEqual({ message: 'mocked' });
      expect(mockEmailQueueService.addResetPasswordJob).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'x@x.com' }),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        { key: 'ResetPasswordMailLastSentAt', args: ['1'] },
        expect.any(Number),
        { ttl: expect.any(Number) },
      );
    });

    it('throws 429 when per-user cooldown is active', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
      });
      mockCacheService.get.mockResolvedValue(Date.now()); // any truthy value = cooldown active

      let thrown: HttpException | undefined;
      await service.forgotPassword('x@x.com').catch((e: HttpException) => {
        thrown = e;
      });

      expect(thrown).toBeInstanceOf(HttpException);
      expect(thrown!.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockEmailQueueService.addResetPasswordJob).not.toHaveBeenCalled();
    });

    it('does not set cooldown key when rate limited', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
      });
      mockCacheService.get.mockResolvedValue(Date.now());

      await service.forgotPassword('x@x.com').catch(() => {});

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('checks and sets cooldown keyed by userId, not email', async () => {
      const user = { id: 'user-42', email: 'x@x.com' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockCacheService.get.mockResolvedValue(null);
      mockEmailQueueService.addResetPasswordJob.mockResolvedValue(undefined);

      await service.forgotPassword('x@x.com');

      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.objectContaining({ args: ['user-42'] }),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ args: ['user-42'] }),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it('uses ResetPasswordMailLastSentAt as cache key', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
      });
      mockCacheService.get.mockResolvedValue(null);
      mockEmailQueueService.addResetPasswordJob.mockResolvedValue(undefined);

      await service.forgotPassword('x@x.com');

      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'ResetPasswordMailLastSentAt' }),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'ResetPasswordMailLastSentAt' }),
        expect.any(Number),
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('deletes session and returns translated message', async () => {
      mockSessionService.deleteById.mockResolvedValue(undefined);

      const result = await service.logout({ sessionId: 'session1' });

      expect(result).toEqual({ message: 'mocked' });
      expect(mockSessionService.deleteById).toHaveBeenCalledWith(
        'session1',
        'logout',
      );
      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.LOGOUT_SUCCESS',
        expect.any(Object),
      );
    });
  });

  describe('update — password change', () => {
    const jwtPayload = { id: 'user1', sessionId: 'session1' };

    it('allows OAuth user to set a first password without oldPassword', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        provider: 'google',
        password: null,
      });
      mockSessionService.deleteByUserIdWithExclude.mockResolvedValue(undefined);
      mockUsersService.update.mockResolvedValue(undefined);
      mockUsersService.findById
        .mockResolvedValueOnce({
          id: 'user1',
          provider: 'google',
          password: null,
        })
        .mockResolvedValueOnce({ id: 'user1', provider: 'google' });

      await expect(
        service.update(jwtPayload as any, { password: 'newpass123' }),
      ).resolves.not.toThrow();

      expect(mockSessionService.deleteByUserIdWithExclude).toHaveBeenCalledWith(
        {
          userId: 'user1',
          excludeSessionId: 'session1',
        },
        'logout',
      );
    });

    it('throws when email user omits oldPassword', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        provider: 'email',
        password: 'somehash',
      });

      await expect(
        service.update(jwtPayload as any, { password: 'newpass123' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when email user provides wrong oldPassword', async () => {
      const hash = await bcrypt.hash('correctpass', 10);
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        provider: 'email',
        password: hash,
      });

      await expect(
        service.update(jwtPayload as any, {
          password: 'newpass123',
          oldPassword: 'wrongpass',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows email user to change password with correct oldPassword', async () => {
      const hash = await bcrypt.hash('correctpass', 10);
      mockUsersService.findById
        .mockResolvedValueOnce({
          id: 'user1',
          provider: 'email',
          password: hash,
        })
        .mockResolvedValueOnce({ id: 'user1', provider: 'email' });
      mockSessionService.deleteByUserIdWithExclude.mockResolvedValue(undefined);
      mockUsersService.update.mockResolvedValue(undefined);

      await expect(
        service.update(jwtPayload as any, {
          password: 'newpass123',
          oldPassword: 'correctpass',
        }),
      ).resolves.not.toThrow();

      expect(mockSessionService.deleteByUserIdWithExclude).toHaveBeenCalledWith(
        {
          userId: 'user1',
          excludeSessionId: 'session1',
        },
        'logout',
      );
    });
  });

  describe('softDelete', () => {
    it('removes user and returns translated message', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      const result = await service.softDelete('user1');

      expect(result).toEqual({ message: 'mocked' });
      expect(mockUsersService.remove).toHaveBeenCalledWith('user1');
      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.DELETE_SUCCESS',
        expect.any(Object),
      );
    });
  });

  describe('validateLogin — session limit', () => {
    it('calls enforceSessionLimit before creating session', async () => {
      const hash = await bcrypt.hash('pass', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user1',
        email: 'x@x.com',
        provider: AuthProvidersEnum.EMAIL,
        password: hash,
        roles: [{ name: 'user' }],
      });
      mockSessionService.create.mockResolvedValue({
        id: 'session1',
        hash: 'h',
      });

      await service.validateLogin({ email: 'x@x.com', password: 'pass' });

      const enforceOrder =
        mockSessionService.enforceSessionLimit.mock.invocationCallOrder[0];
      const createOrder = mockSessionService.create.mock.invocationCallOrder[0];
      expect(enforceOrder).toBeLessThan(createOrder);
      expect(mockSessionService.enforceSessionLimit).toHaveBeenCalledWith(
        'user1',
        10,
      );
    });
  });

  describe('confirmNewEmail', () => {
    const validPayload = { confirmEmailUserId: 'user1', newEmail: 'new@x.com' };

    it('throws UnprocessableEntityException when hash is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('expired'));

      await expect(service.confirmNewEmail('bad-hash')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(validPayload);
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.confirmNewEmail('valid-hash')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates email without changing user status', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(validPayload);
      const user = {
        id: 'user1',
        email: 'old@x.com',
        status: UserStatus.ACTIVE,
      };
      mockUsersService.findById.mockResolvedValue(user);
      mockUsersService.update.mockResolvedValue(undefined);

      await service.confirmNewEmail('valid-hash');

      const updatedUser = mockUsersService.update.mock
        .calls[0][1] as typeof user;
      expect(updatedUser.email).toBe('new@x.com');
      expect(updatedUser.status).toBe(UserStatus.ACTIVE);
    });

    it('does not reactivate a suspended user', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(validPayload);
      const user = {
        id: 'user1',
        email: 'old@x.com',
        status: UserStatus.INACTIVE,
      };
      mockUsersService.findById.mockResolvedValue(user);
      mockUsersService.update.mockResolvedValue(undefined);

      await service.confirmNewEmail('valid-hash');

      const updatedUser = mockUsersService.update.mock
        .calls[0][1] as typeof user;
      expect(updatedUser.status).toBe(UserStatus.INACTIVE);
    });

    it('returns success message', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(validPayload);
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        email: 'old@x.com',
        status: UserStatus.ACTIVE,
      });
      mockUsersService.update.mockResolvedValue(undefined);

      const result = await service.confirmNewEmail('valid-hash');

      expect(result).toEqual({ message: 'mocked' });
      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.NEW_EMAIL_CONFIRM_SUCCESS',
        expect.any(Object),
      );
    });
  });

  describe('validateSocialLogin — conditional update', () => {
    const baseUser = {
      id: 'social1',
      email: 'old@x.com',
      roles: [{ name: 'user' }],
    };

    beforeEach(() => {
      mockSessionService.create.mockResolvedValue({
        id: 'session1',
        hash: 'h',
      });
    });

    it('does NOT call update when found user email already matches social email', async () => {
      mockUsersService.findBySocialIdAndProvider.mockResolvedValue({
        ...baseUser,
        email: 'same@x.com',
      });
      mockUsersService.findByEmail.mockResolvedValue({
        ...baseUser,
        email: 'same@x.com',
      });

      await service.validateSocialLogin('google', {
        id: 'gid1',
        email: 'same@x.com',
        firstName: 'A',
        lastName: 'B',
        provider: 'google',
      });

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('calls update when social email differs from stored email', async () => {
      mockUsersService.findBySocialIdAndProvider.mockResolvedValue(baseUser);
      mockUsersService.findByEmail.mockResolvedValue(null);

      await service.validateSocialLogin('google', {
        id: 'gid1',
        email: 'new@x.com',
        firstName: 'A',
        lastName: 'B',
        provider: 'google',
      });

      expect(mockUsersService.update).toHaveBeenCalledWith(
        'social1',
        expect.objectContaining({ email: 'new@x.com' }),
      );
    });

    it('does NOT call update when social has no email', async () => {
      mockUsersService.findBySocialIdAndProvider.mockResolvedValue(baseUser);
      mockUsersService.findByEmail.mockResolvedValue(null);

      await service.validateSocialLogin('google', {
        id: 'gid1',
        email: undefined,
        firstName: 'A',
        lastName: 'B',
        provider: 'google',
      });

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('throws UnauthorizedException when session not found or hash mismatch', async () => {
      mockSessionService.updateByHash.mockResolvedValue(null);

      await expect(
        service.refreshToken({ sessionId: 'session1', hash: 'badhash' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no roles', async () => {
      mockSessionService.updateByHash.mockResolvedValue({
        id: 'session1',
        user: { id: 'user1' },
      });
      mockUsersService.findById.mockResolvedValue({ id: 'user1', roles: [] });

      await expect(
        service.refreshToken({ sessionId: 'session1', hash: 'hash1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns token data on success', async () => {
      mockSessionService.updateByHash.mockResolvedValue({
        id: 'session1',
        user: { id: 'user1' },
      });
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        roles: [{ name: 'user' }],
      });
      mockCacheService.get.mockResolvedValue(null);
      mockRolesService.getPermissionsForRoles.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshToken({
        sessionId: 'session1',
        hash: 'hash1',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenExpires');
    });

    it('uses cached permissions and skips getPermissionsForRoles on cache hit', async () => {
      mockSessionService.updateByHash.mockResolvedValue({
        id: 'session1',
        user: { id: 'user1' },
      });
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        roles: [{ name: 'user' }],
      });
      mockCacheService.get.mockResolvedValue(['read:task']);

      await service.refreshToken({ sessionId: 'session1', hash: 'hash1' });

      expect(mockRolesService.getPermissionsForRoles).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('fetches and caches permissions on cache miss', async () => {
      mockSessionService.updateByHash.mockResolvedValue({
        id: 'session1',
        user: { id: 'user1' },
      });
      mockUsersService.findById.mockResolvedValue({
        id: 'user1',
        roles: [{ name: 'user' }],
      });
      mockCacheService.get.mockResolvedValue(null);
      mockRolesService.getPermissionsForRoles.mockResolvedValue(['read:task']);

      await service.refreshToken({ sessionId: 'session1', hash: 'hash1' });

      expect(mockRolesService.getPermissionsForRoles).toHaveBeenCalledTimes(1);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'RolePermissions' }),
        ['read:task'],
        { ttl: 300_000 },
      );
    });
  });
});
