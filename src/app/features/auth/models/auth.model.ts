export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

export interface JwtDto {
  jwt: string;
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
