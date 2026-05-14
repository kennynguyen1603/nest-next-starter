import { Job as AllJobs } from '@/constants/job.constant';
import { Job } from 'bullmq';

const EmailJob = AllJobs.Email;

export interface EmailVerificationJob {
  name: typeof EmailJob.EmailVerification;
  data: {
    email: string;
    hash: string;
  };
}

export interface ConfirmNewEmailJob {
  name: typeof EmailJob.ConfirmNewEmail;
  data: {
    email: string;
    hash: string;
  };
}

export interface ResetPasswordJob {
  name: typeof EmailJob.ResetPassword;
  data: {
    email: string;
    hash: string;
    tokenExpires: number;
  };
}

type JobDataMap = {
  [EmailJob.EmailVerification]: EmailVerificationJob['data'];
  [EmailJob.ConfirmNewEmail]: ConfirmNewEmailJob['data'];
  [EmailJob.ResetPassword]: ResetPasswordJob['data'];
};

export type EmailJobUnion =
  | Job<EmailVerificationJob['data'], void, typeof EmailJob.EmailVerification>
  | Job<ConfirmNewEmailJob['data'], void, typeof EmailJob.ConfirmNewEmail>
  | Job<ResetPasswordJob['data'], void, typeof EmailJob.ResetPassword>;

export type { JobDataMap };
