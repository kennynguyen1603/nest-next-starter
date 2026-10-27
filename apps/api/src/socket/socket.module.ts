import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@/shared/cache/cache.module';
import { SessionModule } from '@/session/session.module';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';

@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({}), CacheModule, SessionModule],
  providers: [SocketGateway, SocketService],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
