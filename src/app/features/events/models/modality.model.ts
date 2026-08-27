import { ModalityCategory, ModalityDivision } from '../enums/event-enums';

export interface ModalityRequestDto {
  category: ModalityCategory;
  division: ModalityDivision;
  minAge: number;
  maxAge: number;
  style: string;
  eventId?: number; // Opcional según si se pasa en el body o en la URL
}

export interface ModalityResponseDto {
  id: number;
  category: ModalityCategory;
  division: ModalityDivision;
  minAge: number;
  maxAge: number;
  style: string;
  eventId: number;
}