import { NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PinoLogger } from 'nestjs-pino';
import { FilesService } from '@/files/files.service';
import { User } from './domain/user';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { UsersService } from './users.service';

const repository = {
  findById: jest.fn(),
  update: jest.fn(),
};

function makeService() {
  const i18n = { t: jest.fn((key: string) => key) } as unknown as I18nService;
  const logger = { debug: jest.fn() } as unknown as PinoLogger;
  return new UsersService(
    repository as unknown as UserRepository,
    {} as FilesService,
    i18n,
    logger,
  );
}

describe('UsersService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('findByIdOrFail', () => {
    it('returns the user', async () => {
      repository.findById.mockResolvedValue({ id: 'u1' } as User);

      await expect(makeService().findByIdOrFail('u1')).resolves.toEqual({
        id: 'u1',
      });
    });

    it('throws NotFoundException when the user is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(makeService().findByIdOrFail('missing')).rejects.toEqual(
        new NotFoundException('user.NOT_FOUND'),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the user is missing', async () => {
      repository.update.mockResolvedValue(null);

      await expect(
        makeService().update('missing', { firstName: 'Jane' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
