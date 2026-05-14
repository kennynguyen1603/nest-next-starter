export const Queue = {
  Email: 'email',
} as const;

export const Job = {
  Email: {
    EmailVerification: 'email-verification',
    ConfirmNewEmail: 'confirm-new-email',
    ResetPassword: 'reset-password',
  },
} as const satisfies Record<keyof typeof Queue, Record<string, string>>;
