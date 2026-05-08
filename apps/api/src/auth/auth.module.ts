import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AnonymousStrategy } from './strategies/anonymous.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { MailModule } from '@/mail/mail.module';
import { SessionModule } from '@/session/session.module';
import { UsersModule } from '@/users/users.module';
import { RolesModule } from '@/roles/roles.module';

@Module({
  imports: [
    UsersModule,
    SessionModule,
    RolesModule,
    PassportModule,
    MailModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, AnonymousStrategy],
  exports: [AuthService],
})
export class AuthModule {}
