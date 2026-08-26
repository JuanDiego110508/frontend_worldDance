import { ModalityCategory, ModalityDivision } from '../enums/event-enums';

export interface ModalityRequestDto {
  name: string;
  division: ModalityDivision;
  category: ModalityCategory;
  eventId: number;
}

export interface ModalityResponseDto {
  id: number;
  name: string;
  division: ModalityDivision;
  category: ModalityCategory;
  eventId: number;
}