export type SocialProviders = 'google' | 'facebook' | 'github' | 'twitter';

export interface SocialInterface {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  photoUrl?: string;
  provider: SocialProviders;
}
