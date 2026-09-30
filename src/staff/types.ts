export type StaffRole = "REGIONAL_MANAGER" | "STORE_MANAGER" | "DEPARTMENT_LEAD" | "ASSOCIATE";

export interface UserProfile {
  displayName: string;
  email: string;
}

export interface User {
  id: string;
  storeId: string;
  role: StaffRole;
  profile: UserProfile;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
}
