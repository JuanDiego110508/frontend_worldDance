/**
 * Refleja la entidad `User` real de ms-auth-identityservice (wd-lib-common).
 * El backend no expone rol ni endpoint `/me`: `firstName`/`lastName`/`documentNumber`
 * solo se conocen tras un registro o una actualización de perfil en la sesión actual.
 */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  active: boolean;
}
