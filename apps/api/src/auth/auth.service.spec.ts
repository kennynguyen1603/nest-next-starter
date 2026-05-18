import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
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
import { AuthProvidersEnum } from './auth-providers.enum';

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
    it('returns same message regardless of whether email exists (no enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('notfound@x.com');

      expect(result).toEqual({ message: 'mocked' });
      expect(mockEmailQueueService.addResetPasswordJob).not.toHaveBeenCalled();
    });

    it('sends reset email when user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
      });
      mockJwtService.signAsync.mockResolvedValue('reset-token');
      mockEmailQueueService.addResetPasswordJob.mockResolvedValue(undefined);

      const result = await service.forgotPassword('x@x.com');

      expect(result).toEqual({ message: 'mocked' });
      expect(mockEmailQueueService.addResetPasswordJob).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'x@x.com' }),
      );
    });
  });

  describe('logout', () => {
    it('deletes session and returns translated message', async () => {
      mockSessionService.deleteById.mockResolvedValue(undefined);

      const result = await service.logout({ sessionId: 'session1' });

      expect(result).toEqual({ message: 'mocked' });
      expect(mockSessionService.deleteById).toHaveBeenCalledWith('session1');
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
        .mockResolvedValueOnce({ id: 'user1', provider: 'google', password: null })
        .mockResolvedValueOnce({ id: 'user1', provider: 'google' });

      await expect(
        service.update(jwtPayload as any, { password: 'newpass123' }),
      ).resolves.not.toThrow();

      expect(mockSessionService.deleteByUserIdWithExclude).toHaveBeenCalledWith({
        userId: 'user1',
        excludeSessionId: 'session1',
      });
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
        service.update(jwtPayload as any, { password: 'newpass123', oldPassword: 'wrongpass' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows email user to change password with correct oldPassword', async () => {
      const hash = await bcrypt.hash('correctpass', 10);
      mockUsersService.findById
        .mockResolvedValueOnce({ id: 'user1', provider: 'email', password: hash })
        .mockResolvedValueOnce({ id: 'user1', provider: 'email' });
      mockSessionService.deleteByUserIdWithExclude.mockResolvedValue(undefined);
      mockUsersService.update.mockResolvedValue(undefined);

      await expect(
        service.update(jwtPayload as any, { password: 'newpass123', oldPassword: 'correctpass' }),
      ).resolves.not.toThrow();

      expect(mockSessionService.deleteByUserIdWithExclude).toHaveBeenCalledWith({
        userId: 'user1',
        excludeSessionId: 'session1',
      });
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
});
