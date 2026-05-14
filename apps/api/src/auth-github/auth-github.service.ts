import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthGithubLoginDto } from './dto/auth-github-login.dto';
import { GithubInterface } from './interfaces/github.interface';

@Injectable()
export class AuthGithubService {
  private readonly apiUrl = 'https://api.github.com';

  async getProfileByToken(
    loginDto: AuthGithubLoginDto,
  ): Promise<SocialInterface> {
    try {
      const response = await fetch(`${this.apiUrl}/user`, {
        headers: {
          Authorization: `Bearer ${loginDto.accessToken}`,
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new HttpException(
          'GitHub API error',
          response.status === 401 ? HttpStatus.UNAUTHORIZED : response.status,
        );
      }

      const data: GithubInterface = (await response.json()) as GithubInterface;

      if (!data.id) {
        throw new HttpException(
          'Invalid GitHub profile data',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [firstName, ...rest] = (data.name ?? data.login).split(' ');
      const lastName = rest.join(' ') || undefined;

      return {
        id: String(data.id),
        email: data.email ?? undefined,
        firstName,
        lastName,
        provider: 'github',
        photoUrl: data.avatar_url,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new HttpException(
          'GitHub API request timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        'Failed to get GitHub profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
