import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthTwitterLoginDto } from './dto/auth-twitter-login.dto';
import { TwitterInterface } from './interfaces/twitter.interface';

@Injectable()
export class AuthTwitterService {
  private readonly apiUrl = 'https://api.twitter.com/2';

  constructor(
    @InjectPinoLogger(AuthTwitterService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getProfileByToken(
    loginDto: AuthTwitterLoginDto,
  ): Promise<SocialInterface> {
    this.logger.debug('Fetching Twitter user profile');

    try {
      const url = new URL(`${this.apiUrl}/users/me`);
      url.searchParams.set('user.fields', 'name,username,profile_image_url');

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${loginDto.accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(
          { statusCode: response.status },
          'Twitter API returned non-OK status',
        );
        throw new HttpException(
          'Twitter API error',
          response.status === 401 ? HttpStatus.UNAUTHORIZED : response.status,
        );
      }

      const body: { data: TwitterInterface } = (await response.json()) as {
        data: TwitterInterface;
      };
      const data = body.data;

      if (!data?.id) {
        this.logger.warn('Twitter profile response missing id field');
        throw new HttpException(
          'Invalid Twitter profile data',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [firstName, ...rest] = (data.name ?? data.username ?? '').split(
        ' ',
      );
      const lastName = rest.join(' ') || undefined;

      this.logger.debug({ twitterId: data.id }, 'Twitter profile retrieved');

      return {
        id: data.id,
        firstName,
        lastName,
        provider: 'twitter',
        photoUrl: data.profile_image_url?.replace('_normal', '_400x400'),
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn('Twitter API request timed out');
        throw new HttpException(
          'Twitter API request timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      this.logger.error(
        { err: error },
        'Unexpected error fetching Twitter profile',
      );
      throw new HttpException(
        'Failed to get Twitter profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
