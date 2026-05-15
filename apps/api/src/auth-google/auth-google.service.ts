import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthGoogleLoginDto } from './dto/auth-google-login.dto';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class AuthGoogleService {
  private google: OAuth2Client;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectPinoLogger(AuthGoogleService.name)
    private readonly logger: PinoLogger,
  ) {
    this.google = new OAuth2Client(
      configService.get('google.clientId', { infer: true }),
      configService.get('google.clientSecret', { infer: true }),
    );
  }

  async getProfileByToken(
    loginDto: AuthGoogleLoginDto,
  ): Promise<SocialInterface> {
    this.logger.debug('Verifying Google ID token');

    let ticket: LoginTicket;
    try {
      ticket = await this.google.verifyIdToken({
        idToken: loginDto.idToken,
        audience: [
          this.configService.getOrThrow('google.clientId', { infer: true }),
        ],
      });
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Google ID token verification failed');
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { user: 'wrongToken' },
      });
    }

    const data = ticket.getPayload();

    if (!data) {
      this.logger.warn('Google token verified but payload is empty');
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { user: 'wrongToken' },
      });
    }

    this.logger.debug({ googleSub: data.sub }, 'Google profile retrieved');

    return {
      id: data.sub,
      email: data.email,
      provider: 'google',
      firstName: data.given_name,
      lastName: data.family_name,
      photoUrl: data.picture,
    };
  }
}
