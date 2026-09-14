import { EventStatus } from '../enums/event-enums';

export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

/** Refleja PageResponseDto de ms-event-category (GET /events/page). */
export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type EventStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'MINE';

export interface EventRequestDto {
  ownerId?: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
}

/** Refleja EventResponseDto real de ms-event-category: Jackson serializa el campo `idEvent`. */
export interface EventResponseDto {
  idEvent: number;
  id?: number;
  IdEvent?: number;
  ownerId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  message?: string;
}

export { EventStatus };
