import { Job, Queue } from './job.constant';

describe('job.constant', () => {
  it('Notification queue and job names are defined', () => {
    expect(Queue.Notification).toBe('notification');
    expect(Job.Notification.CreateNotification).toBe('create-notification');
  });
});
