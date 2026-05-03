export const Queue = {
  Email: 'email',
} as const;

export const Job = {
  Email: {
    EmailVerification: 'email-verification',
    SignInMagicLink: 'signin-magic-link',
    ResetPassword: 'reset-password',
  },
} as const satisfies Record<keyof typeof Queue, Record<string, string>>;
