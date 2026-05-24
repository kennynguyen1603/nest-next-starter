import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { NotificationType } from '@/notifications/notifications.enum';
import { Job } from 'bullmq';

export interface CreateNotificationJob {
  name: typeof JobConstants.Notification.CreateNotification;
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
  typeof JobConstants.Notification.CreateNotification
>;

export { QueueName };
