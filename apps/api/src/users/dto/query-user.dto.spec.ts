import {
  BadRequestException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';

import validationOptions from '@/utils/validation-options';
import { RoleEnum } from '@/roles/roles.enum';
import { QueryUserDto } from './query-user.dto';

// Run the DTO through the same global pipe the app uses, so the test covers
// the real query-string → DTO path (JSON parsing, transforms and validation).
const pipe = new ValidationPipe(validationOptions);

function transform(query: Record<string, unknown>): Promise<QueryUserDto> {
  return pipe.transform(query, { type: 'query', metatype: QueryUserDto });
}

describe('QueryUserDto', () => {
  it('accepts a whitelisted sort and normalizes the order to upper case', async () => {
    const dto = await transform({
      sort: JSON.stringify([
        { orderBy: 'createdAt', order: 'desc' },
        { orderBy: 'email', order: 'ASC' },
      ]),
    });

    expect(dto.sort).toEqual([
      { orderBy: 'createdAt', order: 'DESC' },
      { orderBy: 'email', order: 'ASC' },
    ]);
  });

  it('leaves sort and filters undefined when they are omitted', async () => {
    const dto = await transform({});

    expect(dto.sort).toBeUndefined();
    expect(dto.filters).toBeUndefined();
  });

  it.each([
    'password',
    'socialId',
    'roles',
    'photo',
    '__proto__',
    'email; DROP',
  ])('rejects sorting on non-whitelisted field %p', async (orderBy) => {
    await expect(
      transform({ sort: JSON.stringify([{ orderBy, order: 'ASC' }]) }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it.each(['up', '1', ''])(
    'rejects an invalid sort order %p',
    async (order) => {
      await expect(
        transform({ sort: JSON.stringify([{ orderBy: 'email', order }]) }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    },
  );

  it('rejects a non-string sort order', async () => {
    await expect(
      transform({ sort: JSON.stringify([{ orderBy: 'email', order: 1 }]) }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a sort that is not an array', async () => {
    await expect(
      transform({
        sort: JSON.stringify({ orderBy: 'email', order: 'ASC' }),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects unknown keys inside a sort entry', async () => {
    await expect(
      transform({
        sort: JSON.stringify([{ orderBy: 'email', order: 'ASC', $where: '1' }]),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('returns 400 instead of 500 for malformed sort JSON', async () => {
    await expect(transform({ sort: '[{' })).rejects.toThrow(
      new BadRequestException('sort must be valid JSON'),
    );
  });

  it('returns 400 instead of 500 for malformed filters JSON', async () => {
    await expect(transform({ filters: '{roles:' })).rejects.toThrow(
      new BadRequestException('filters must be valid JSON'),
    );
  });

  it('accepts a role filter with a valid role', async () => {
    const dto = await transform({
      filters: JSON.stringify({ roles: [{ name: RoleEnum.ADMIN }] }),
    });

    expect(dto.filters?.roles).toEqual([{ name: RoleEnum.ADMIN }]);
  });

  it('rejects a role filter with an unknown role', async () => {
    await expect(
      transform({ filters: JSON.stringify({ roles: [{ name: 'root' }] }) }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects operator injection in filters', async () => {
    await expect(
      transform({
        filters: JSON.stringify({ roles: [{ name: { $ne: null } }] }),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
