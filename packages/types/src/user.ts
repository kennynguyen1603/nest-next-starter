export interface UserPhoto {
  id: string;
  path: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provider: string;
  photo?: UserPhoto | null;
}
