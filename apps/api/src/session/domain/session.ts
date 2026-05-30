import { User } from '@/users/domain/user';

export type RevokeReason =
  | 'logout'
  | 'suspicious'
  | 'expired'
  | 'limit_exceeded';

export class Session {
  id!: number | string;
  user!: User;
  hash!: string;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  platform?: string;
  lastUsedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
  revokeAt?: Date;
  revokeReason?: RevokeReason;
}
