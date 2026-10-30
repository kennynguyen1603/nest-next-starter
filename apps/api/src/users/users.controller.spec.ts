import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SessionService } from '@/session/session.service';
import { User } from './domain/user';
import { UserStatus } from './user-status.enum';
import { RoleEnum } from '@/roles/roles.enum';
import { UpdateUserDto } from './dto/update-user.dto';

const mockUsersService = {
  update: jest.fn(),
  remove: jest.fn(),
};

const mockSessionService = {
  deleteByUserId: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUsersService.update.mockResolvedValue({ id: 'user-id' } as User);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();
    controller = module.get(UsersController);
  });

  describe('update', () => {
    it.each<[string, UpdateUserDto]>([
      ['password', { password: 'new-secret' }],
      ['roles', { roles: [{ name: RoleEnum.USER }] }],
      ['status banned', { status: UserStatus.BANNED }],
      ['status inactive', { status: UserStatus.INACTIVE }],
    ])('revokes all sessions when %s changes', async (_, dto) => {
      await controller.update('user-id', dto);

      expect(mockSessionService.deleteByUserId).toHaveBeenCalledWith(
        { userId: 'user-id' },
        'admin_revoked',
      );
    });

    it.each<[string, UpdateUserDto]>([
      ['profile fields', { firstName: 'Jane' }],
      ['status active', { status: UserStatus.ACTIVE }],
    ])('keeps sessions when only %s change', async (_, dto) => {
      await controller.update('user-id', dto);

      expect(mockSessionService.deleteByUserId).not.toHaveBeenCalled();
    });

    it('does not revoke when the user does not exist', async () => {
      mockUsersService.update.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update('missing', { password: 'new-secret' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockSessionService.deleteByUserId).not.toHaveBeenCalled();
    });
  });

  it('remove deletes the user and revokes their sessions', async () => {
    await controller.remove('user-id');

    expect(mockUsersService.remove).toHaveBeenCalledWith('user-id');
    expect(mockSessionService.deleteByUserId).toHaveBeenCalledWith(
      { userId: 'user-id' },
      'admin_revoked',
    );
  });
});
