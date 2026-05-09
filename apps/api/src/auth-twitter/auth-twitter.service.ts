import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthTwitterLoginDto } from './dto/auth-twitter-login.dto';
import { TwitterInterface } from './interfaces/twitter.interface';

@Injectable()
export class AuthTwitterService {
  private readonly apiUrl = 'https://api.twitter.com/2';

  async getProfileByToken(
    loginDto: AuthTwitterLoginDto,
  ): Promise<SocialInterface> {
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
        throw new HttpException(
          'Twitter API error',
          response.status === 401 ? HttpStatus.UNAUTHORIZED : response.status,
        );
      }

      const body: { data: TwitterInterface } = await response.json();
      const data = body.data;

      if (!data?.id) {
        throw new HttpException(
          'Invalid Twitter profile data',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [firstName, ...rest] = (data.name ?? data.username ?? '').split(
        ' ',
      );
      const lastName = rest.join(' ') || undefined;

      return {
        id: data.id,
        firstName,
        lastName,
        provider: 'twitter',
        photoUrl: data.profile_image_url?.replace('_normal', '_400x400'),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.name === 'TimeoutError') {
        throw new HttpException(
          'Twitter API request timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        'Failed to get Twitter profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
