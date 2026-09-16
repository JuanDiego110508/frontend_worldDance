export enum EventRole {
  ADMIN = 'ADMIN',
  JURY = 'JURY',
  STAFF = 'STAFF',
  PARTICIPANT = 'PARTICIPANT',
  INSTRUCTOR = 'INSTRUCTOR'
}

export interface ParticipantSummaryDto {
  id: number;
  name: string;
  lastName: string;
  email: string;
  documentNumber: string;
}

export interface EnrollmentResponseDto {
  enrollmentId: number;
  userId: number;
  eventId: number;
  modalityId: number;
  modalityCategory: string;
  roleInEvent: EventRole;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  participant?: ParticipantSummaryDto;
}

export interface Enrollment {
  id?: number;
  participantId: number;
  participant?: any;
  categoryId: number;
  categoryName?: string;
  eventId?: number;
  eventName?: string;
  status: EnrollmentStatus;
  createdAt?: Date;
}

export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const ENROLLMENT_STATUS: { value: EnrollmentStatus; label: string; class: string }[] = [
  { value: 'PENDING', label: 'Pendiente', class: 'status-pending' },
  { value: 'APPROVED', label: 'Aprobado', class: 'status-approved' },
  { value: 'REJECTED', label: 'Rechazado', class: 'status-rejected' }
];
