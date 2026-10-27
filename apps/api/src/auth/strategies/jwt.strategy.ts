import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { SessionService } from '@/session/session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AllConfigType>,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('auth.secret', { infer: true }),
    });
  }

  // The access token is bound to its session: once a session is revoked
  // (logout, password reset, refresh-token reuse, session limit) every access
  // token issued for it stops working immediately, not at token expiry.
  public async validate(payload: JwtPayloadType): Promise<JwtPayloadType> {
    if (!payload.id || !payload.sessionId) {
      throw new UnauthorizedException();
    }

    const isActive = await this.sessionService.isActiveForUser(
      payload.sessionId,
      payload.id,
    );
    if (!isActive) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
