import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { RolesRepository } from './infrastructure/persistence/roles.repository';
import { CacheService } from '@/shared/cache/cache.service';
import { RoleEnum } from './roles.enum';
import { Permission } from './permissions.enum';

const mockRolesRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  getPermissionsForRoles: jest.fn(),
  getRoleNamesForUser: jest.fn(),
  assignRolesToUser: jest.fn(),
};

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue({ key: 'cache-key' }),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RolesRepository, useValue: mockRolesRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  describe('getPermissionsForRoles', () => {
    it('returns empty array immediately for empty roles without touching cache or repo', async () => {
      const result = await service.getPermissionsForRoles([]);

      expect(result).toEqual([]);
      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(mockRolesRepository.getPermissionsForRoles).not.toHaveBeenCalled();
    });

    it('queries repo and caches result on cache miss', async () => {
      const permissions = [Permission.TASK_READ, Permission.TASK_CREATE];
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue(permissions);

      const result = await service.getPermissionsForRoles([RoleEnum.USER]);

      expect(result).toEqual(permissions);
      expect(mockRolesRepository.getPermissionsForRoles).toHaveBeenCalledWith([
        RoleEnum.USER,
      ]);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        { key: 'RolePermissions', args: ['user'] },
        permissions,
        { ttl: expect.any(Number) },
      );
    });

    it('returns cached value and does not query repo on cache hit', async () => {
      const cached = [Permission.TASK_READ];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getPermissionsForRoles([RoleEnum.USER]);

      expect(result).toEqual(cached);
      expect(mockRolesRepository.getPermissionsForRoles).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('produces identical cache key regardless of role input order', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue([]);

      await service.getPermissionsForRoles([RoleEnum.USER, RoleEnum.ADMIN]);
      await service.getPermissionsForRoles([RoleEnum.ADMIN, RoleEnum.USER]);

      const firstArg = (
        mockCacheService.get.mock.calls[0] as [{ args: string[] }]
      )[0];
      const secondArg = (
        mockCacheService.get.mock.calls[1] as [{ args: string[] }]
      )[0];
      expect(firstArg).toEqual(secondArg);
    });

    it('builds cache key from alphabetically sorted role names', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue([]);

      // RoleEnum.ADMIN='admin', RoleEnum.USER='user' → sorted: 'admin,user'
      await service.getPermissionsForRoles([RoleEnum.USER, RoleEnum.ADMIN]);

      expect(mockCacheService.get).toHaveBeenCalledWith({
        key: 'RolePermissions',
        args: ['admin,user'],
      });
    });

    it('uses different cache keys for different role combinations', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue([]);

      await service.getPermissionsForRoles([RoleEnum.USER]);
      await service.getPermissionsForRoles([RoleEnum.ADMIN]);

      const userCacheArg = (
        mockCacheService.get.mock.calls[0] as [{ args: string[] }]
      )[0].args[0];
      const adminCacheArg = (
        mockCacheService.get.mock.calls[1] as [{ args: string[] }]
      )[0].args[0];
      expect(userCacheArg).not.toBe(adminCacheArg);
    });

    it('caches empty permissions array when repo returns none', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue([]);

      const result = await service.getPermissionsForRoles([RoleEnum.USER]);

      expect(result).toEqual([]);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(Object),
        [],
        expect.any(Object),
      );
    });

    it('sets TTL of exactly 5 minutes on permissions cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue([]);

      await service.getPermissionsForRoles([RoleEnum.USER]);

      const setCall = mockCacheService.set.mock.calls[0] as [
        unknown,
        unknown,
        { ttl: number },
      ];
      expect(setCall[2]).toEqual({ ttl: 5 * 60 * 1000 });
    });

    it('queries repo with original (unsorted) role list, caches with sorted key', async () => {
      const input = [RoleEnum.USER, RoleEnum.ADMIN];
      mockCacheService.get.mockResolvedValue(null);
      mockRolesRepository.getPermissionsForRoles.mockResolvedValue([]);

      await service.getPermissionsForRoles(input);

      // repo receives original input
      expect(mockRolesRepository.getPermissionsForRoles).toHaveBeenCalledWith(
        input,
      );
      // cache key is sorted
      expect(mockCacheService.set).toHaveBeenCalledWith(
        { key: 'RolePermissions', args: ['admin,user'] },
        expect.any(Array),
        expect.any(Object),
      );
    });
  });
});
