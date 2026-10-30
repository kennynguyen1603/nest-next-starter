export type SocialProviders = 'google' | 'facebook' | 'github' | 'twitter';

export interface SocialInterface {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /**
   * True only when the provider guarantees the user owns `email`. Accounts are
   * linked by email, so an unverified address must never be trusted for that.
   */
  emailVerified?: boolean;
  photoUrl?: string;
  provider: SocialProviders;
}
