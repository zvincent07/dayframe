import { Role } from "@/permissions/roles";

export interface User {
  _id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  username?: string;
  googleId?: string;
  emailVerified?: Date | string;
  isBanned?: boolean;
  lastLogin?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  bio?: string;
  goals?: string[];
  timezone?: string;
}

export interface UserFilter {
  search?: string;
  role?: string;
  status?: string; // Added status for frontend filter consistency
  isBanned?: boolean;
  page?: number;
}
