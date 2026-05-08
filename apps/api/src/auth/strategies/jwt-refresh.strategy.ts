import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AllConfigType } from '@/config/config.type';
import { OrNeverType } from '@/utils/types/or-never.type';
import { JwtRefreshPayloadType } from '@/auth/strategies/types/jwt-refresh-payload.type';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService<AllConfigType>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req.cookies as Record<string, string>)?.refresh_token ?? null,
      ]),
      secretOrKey: configService.getOrThrow('auth.refreshSecret', {
        infer: true,
      }),
    });
  }

  public validate(
    payload: JwtRefreshPayloadType,
  ): OrNeverType<JwtRefreshPayloadType> {
    if (!payload.sessionId) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
