import { plainToInstance } from 'class-transformer';
import { AuthEmailLoginDto } from './auth-email-login.dto';

describe('AuthEmailLoginDto — email transform', () => {
  it('lowercases email on deserialization', () => {
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
