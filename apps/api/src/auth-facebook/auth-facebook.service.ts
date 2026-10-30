import { createHmac } from 'crypto';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SocialInterface } from '../social/interfaces/social.interface';
import {
  FacebookDebugTokenResponse,
  FacebookErrorResponse,
  FacebookInterface,
} from './interfaces/facebook.interface';
import { AuthFacebookLoginDto } from './dto/auth-facebook-login.dto';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class AuthFacebookService {
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly apiVersion = 'v23.0';

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectPinoLogger(AuthFacebookService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Retrieves a Facebook user profile using the provided access token.
   * First validates the token, then fetches the user's profile fields.
   * @param loginDto DTO containing the short-lived Facebook access token.
   * @returns Normalized user profile in internal SocialInterface format.
   */
  async getProfileByToken(
    loginDto: AuthFacebookLoginDto,
  ): Promise<SocialInterface> {
    this.logger.debug('Fetching Facebook user profile');
    try {
      const credentials = this.getAppCredentials();

      // Step 1: Verify that the token is valid and belongs to our app
      await this.verifyAccessToken(loginDto.accessToken, credentials);

      // Step 2: Construct the profile URL and query Facebook for user data
      const profileUrl = new URL(`${this.baseUrl}/${this.apiVersion}/me`);
      profileUrl.searchParams.set(
        'fields',
        'id,last_name,email,first_name,picture.width(200)',
      );
      // appsecret_proof proves the call comes from our server, so a leaked
      // user token cannot be replayed against Graph with our app identity.
      profileUrl.searchParams.set(
        'appsecret_proof',
        createHmac('sha256', credentials.appSecret)
          .update(loginDto.accessToken)
          .digest('hex'),
      );

      const response = await fetch(profileUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          // Header rather than query string keeps the token out of URL logs.
          Authorization: `Bearer ${loginDto.accessToken}`,
        },
        signal: AbortSignal.timeout(10000), // Abort request if it exceeds 10 seconds
      });

      // Handle HTTP errors gracefully
      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as FacebookErrorResponse;
        this.logger.warn(
          { statusCode: response.status },
          'Facebook profile API returned non-OK status',
        );
        throw new HttpException(
          errorData.error?.message || 'Facebook API error',
          response.status,
        );
      }

      const data = (await response.json()) as FacebookInterface;

      // Ensure required fields are present in the response
      if (!data.id) {
        this.logger.warn('Facebook profile response missing id field');
        throw new HttpException(
          'Invalid Facebook profile data',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.debug({ facebookId: data.id }, 'Facebook profile retrieved');

      // Map Facebook data to our internal social user interface
      return {
        id: data.id,
        email: data.email || undefined,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        provider: 'facebook',
        photoUrl: data.picture?.data?.url,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn('Facebook API request timed out');
        throw new HttpException(
          'Facebook API request timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      this.logger.error(
        { err: error },
        'Unexpected error fetching Facebook profile',
      );
      throw new HttpException(
        'Failed to get Facebook profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getAppCredentials(): { appId: string; appSecret: string } {
    const appId = this.configService.get('facebook.appId', { infer: true });
    const appSecret = this.configService.get('facebook.appSecret', {
      infer: true,
    });

    if (!appId || !appSecret) {
      throw new HttpException(
        'Facebook app credentials not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { appId, appSecret };
  }

  /**
   * Validates the Facebook access token by calling the /debug_token endpoint.
   * Also ensures the token belongs to our application.
   * @param accessToken The user's short-lived access token to be verified.
   */
  private async verifyAccessToken(
    accessToken: string,
    { appId, appSecret }: { appId: string; appSecret: string },
  ): Promise<void> {
    try {
      const debugUrl = new URL(`${this.baseUrl}/debug_token`);
      debugUrl.searchParams.set('input_token', accessToken);

      const response = await fetch(debugUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          // App access token; sent as a header so the secret never lands in URLs.
          Authorization: `Bearer ${appId}|${appSecret}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for validation
      });

      if (!response.ok) {
        throw new HttpException(
          'Token verification failed',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = (await response.json()) as FacebookDebugTokenResponse;
      const tokenData = result.data;

      // Check if the token is valid and active
      if (!tokenData?.is_valid) {
        throw new HttpException(
          'Invalid Facebook access token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Check if the token belongs to our app (security measure)
      if (tokenData.app_id !== appId) {
        throw new HttpException(
          'Access token does not belong to this app',
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Token verification failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
