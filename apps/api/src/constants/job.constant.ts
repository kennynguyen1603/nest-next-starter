export const Queue = {
  Email: 'email',
  Notification: 'notification',
} as const;

export const Job = {
  Email: {
    EmailVerification: 'email-verification',
    ConfirmNewEmail: 'confirm-new-email',
    ResetPassword: 'reset-password',
  },
  Notification: {
    CreateNotification: 'create-notification',
  },
} as const satisfies Record<keyof typeof Queue, Record<string, string>>;
