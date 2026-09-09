import { EventStatus } from '../enums/event-enums';

export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

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
