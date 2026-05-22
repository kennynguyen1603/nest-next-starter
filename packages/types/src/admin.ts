export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalRevenue: number;
  activeOrders: number;
  userGrowthPercent: number;
}

export interface AdminActivity {
  id: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface UserGrowthPoint {
  date: string;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  photo?: { id: string; path: string } | null;
  roles: { id: number; name: string }[];
  status: string | null;
  createdAt: string;
  updatedAt: string;
}
