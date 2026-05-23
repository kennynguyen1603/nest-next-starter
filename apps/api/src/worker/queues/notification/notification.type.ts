import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { NotificationType } from '@/notifications/notifications.enum';
import { Job } from 'bullmq';

const NotificationJob = JobConstants.Notification;

export interface CreateNotificationJob {
  name: typeof NotificationJob.CreateNotification;
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  };
}

export type NotificationJobUnion = Job<
  CreateNotificationJob['data'],
  void,
  typeof NotificationJob.CreateNotification
>;

export { QueueName };
