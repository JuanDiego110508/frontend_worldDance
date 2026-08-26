import { EventStatus } from '../enums/event-enums';
import { ModalityResponseDto } from './modality.model';

export interface EventRequestDto {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
}

export interface EventResponseDto {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  modalities?: ModalityResponseDto[];
}