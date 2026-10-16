export interface RequestUser {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export interface RequestTenant {
  organizationId: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  organizationId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number;
}
