import { Participant } from './participant.interface';

export interface Enrollment {
  id?: number;
  participantId: number;
  participant?: Participant;
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