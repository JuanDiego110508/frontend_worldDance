import { ModalityCategory } from '../../events/enums/event-enums';

export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Coincide con EventRole de wd-lib-common. */
export enum EventRole {
  ADMIN = 'ADMIN',
  JURY = 'JURY',
  STAFF = 'STAFF',
  PARTICIPANT = 'PARTICIPANT',
  INSTRUCTOR = 'INSTRUCTOR'
}

/** Coincide con EnrollmentRequestDto: el "participante" es el propio usuario autenticado (userId). */
export interface EnrollmentRequestDto {
  userId: number;
  eventId: number;
  modalityId: number;
  roleInEvent: EventRole;
}

/**
 * Coincide con EnrollmentResponseDto. El backend NO rellena `roleInEvent` en las respuestas
 * de /category, /my y /{id} (solo en la respuesta inicial de creación), así que puede venir undefined.
 */
export interface EnrollmentResponseDto {
  enrollmentId: number;
  userId: number;
  eventId: number;
  modalityId: number;
  roleInEvent?: EventRole;
  status: EnrollmentStatus;
  createdAt: string;
}

export interface ApproveEnrollmentRequestDto {
  enrollmentId: number;
  status: Extract<EnrollmentStatus, 'APPROVED' | 'REJECTED'>;
  /** Obligatorio cuando status es REJECTED (validado por el backend). */
  reason?: string;
}

export interface UserEventRoleResponseDto {
  id: number;
  userId: number;
  eventId: number;
  roleInEvent: EventRole;
}

export const ENROLLMENT_STATUS: { value: EnrollmentStatus; label: string; class: string }[] = [
  { value: 'PENDING', label: 'Pendiente', class: 'status-pending' },
  { value: 'APPROVED', label: 'Aprobado', class: 'status-approved' },
  { value: 'REJECTED', label: 'Rechazado', class: 'status-rejected' }
];

export { ModalityCategory };
