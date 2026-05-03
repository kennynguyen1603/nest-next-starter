/**
 * These template name must match with actual email template files specified at ~/src/shared/mail/templates
 */
export const MailTemplate = {
  EmailVerification: 'email-verification',
  SignInMagicLink: 'signin-magic-link',
  ResetPassword: 'reset-password',
} as const;
