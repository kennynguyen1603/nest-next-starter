import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthGithubLoginDto } from './dto/auth-github-login.dto';
import { GithubInterface } from './interfaces/github.interface';

@Injectable()
export class AuthGithubService {
  private readonly apiUrl = 'https://api.github.com';

  constructor(
    @InjectPinoLogger(AuthGithubService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getProfileByToken(
    loginDto: AuthGithubLoginDto,
  ): Promise<SocialInterface> {
    this.logger.debug('Fetching GitHub user profile');

    try {
      const response = await fetch(`${this.apiUrl}/user`, {
        headers: {
          Authorization: `Bearer ${loginDto.accessToken}`,
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(
          { statusCode: response.status },
          'GitHub API returned non-OK status',
        );
        throw new HttpException(
          'GitHub API error',
          response.status === 401 ? HttpStatus.UNAUTHORIZED : response.status,
        );
      }

      const data: GithubInterface = (await response.json()) as GithubInterface;

      if (!data.id) {
        this.logger.warn('GitHub profile response missing id field');
        throw new HttpException(
          'Invalid GitHub profile data',
          HttpStatus.BAD_REQUEST,
        );
      }

      // /user only returns email when the user has set it public.
      // Fall back to /user/emails (requires user:email scope) to get the
      // primary verified email for users with a private email setting.
      let email: string | undefined = data.email ?? undefined;
      if (!email) {
        const emailsRes = await fetch(`${this.apiUrl}/user/emails`, {
          headers: {
            Authorization: `Bearer ${loginDto.accessToken}`,
            Accept: 'application/vnd.github+json',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (emailsRes.ok) {
          const emails: Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }> = await emailsRes.json();
          email = emails.find((e) => e.primary && e.verified)?.email;
          this.logger.debug(
            { githubId: data.id, email },
            'GitHub email resolved from /user/emails',
          );
        } else {
          this.logger.warn(
            { statusCode: emailsRes.status },
            'GitHub /user/emails returned non-OK status',
          );
        }
      }

      const [firstName, ...rest] = (data.name ?? data.login).split(' ');
      const lastName = rest.join(' ') || undefined;

      this.logger.debug({ githubId: data.id }, 'GitHub profile retrieved');

      return {
        id: String(data.id),
        email,
        firstName,
        lastName,
        provider: 'github',
        photoUrl: data.avatar_url,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn('GitHub API request timed out');
        throw new HttpException(
          'GitHub API request timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      this.logger.error(
        { err: error },
        'Unexpected error fetching GitHub profile',
      );
      throw new HttpException(
        'Failed to get GitHub profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
