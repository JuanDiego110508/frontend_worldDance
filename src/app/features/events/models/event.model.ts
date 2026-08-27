import { EventStatus } from '../enums/event-enums';
import { ModalityResponseDto } from './modality.model';

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

export interface EventResponseDto {
  id?: number;
  IdEvent?: number;
  idEvent?: number;
  ownerId: number;
  name: string;
  title?: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  message?: string;
  modalities?: ModalityResponseDto[];
}

export interface EventItem {
  id: number;
  name: string;
  title?: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  ownerId: number;
  createdAt?: string;
  updatedAt?: string;
}

export { EventStatus };


