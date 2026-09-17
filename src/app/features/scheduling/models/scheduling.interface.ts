export enum ScheduleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED'
}

export interface ScheduleGenerationRequestDto {
  eventId: number;
  defaultDurationMinutes: number;
  transitionMinutes: number;
  sortingStrategy: string;
  modalityOrder?: number[];
  stageNames?: string[];
  notes?: string;
}

export interface ScheduleSlotDto {
  id: number;
  enrollmentId: number;
  participantName: string;
  groupName: string;
  division: string;
  category: string;
  style: string;
  startTime: string;
  endTime: string;
  stage: string;
  order: number;
  status: ScheduleStatus;
  notes: string;
  score?: number; // Representa la calificación si el jurado ya la realizó
}

export interface ScheduleGenerationResponseDto {
  eventId: number;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  totalSlots: number;
  generatedAt: string;
  schedules: ScheduleSlotDto[];
}
