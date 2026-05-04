export type SocialProviders = 'google' | 'github' | 'twitter';

export interface SocialInterface {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  provider: SocialProviders;
}
