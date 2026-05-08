import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthEmailLoginDto } from './auth-email-login.dto';

describe('AuthEmailLoginDto', () => {
  describe('email transform', () => {
    it('lowercases email', () => {
      const dto = plainToInstance(AuthEmailLoginDto, {
        email: 'USER@EXAMPLE.COM',
        password: 'secret',
      });
      expect(dto.email).toBe('user@example.com');
    });

    it('trims whitespace from email', () => {
      const dto = plainToInstance(AuthEmailLoginDto, {
        email: '  User@Example.COM  ',
        password: 'secret',
      });
      expect(dto.email).toBe('user@example.com');
    });
  });

  describe('validation', () => {
    it('passes with valid email and password', async () => {
      const dto = plainToInstance(AuthEmailLoginDto, {
        email: 'test@example.com',
        password: 'secret',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails with invalid email format', async () => {
      const dto = plainToInstance(AuthEmailLoginDto, {
        email: 'not-an-email',
        password: 'secret',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('fails with empty password', async () => {
      const dto = plainToInstance(AuthEmailLoginDto, {
        email: 'test@example.com',
        password: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });
});
