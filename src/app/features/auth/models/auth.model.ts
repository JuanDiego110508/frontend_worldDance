export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

export interface JwtDto {
  jwt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    documentNumber: string;
    email: string;
    active: boolean;
  };
}

/** Coincide con RegisterRequestDto de ms-auth-identityservice. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  password: string;
}

/** Coincide con RegisterResponseDto de ms-auth-identityservice. */
export interface RegisterResponse {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  active: boolean;
  message: string;
}

/** Coincide con UpdateUserDto de ms-auth-identityservice. */
export interface UpdateUserRequest {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  active: boolean;
}

export interface PasswordRecoveryRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface PasswordResetRequest {
  email: string;
  code: string;
  newPassword: string;
}
