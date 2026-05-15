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
        'auth.EMAIL_NOT_FOUND',
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

    it('throws UnprocessableEntityException when password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
        provider: AuthProvidersEnum.EMAIL,
        password: 'wronghash',
        roles: [],
      });

      await expect(
        service.validateLogin({ email: 'x@x.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockI18n.t).toHaveBeenCalledWith(
        'auth.INCORRECT_PASSWORD',
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
