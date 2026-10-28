import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { SessionModule } from '@/session/session.module';
import { UsersModule } from '@/users/users.module';
import { FilesModule } from '@/files/files.module';
import { RolesModule } from '@/roles/roles.module';
import { EmailQueueModule } from '@/worker/queues/email/email.module';
import { CacheModule } from '@/shared/cache/cache.module';

@Module({
  imports: [
    UsersModule,
    FilesModule,
    SessionModule,
    RolesModule,
    PassportModule,
    EmailQueueModule,
    CacheModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
