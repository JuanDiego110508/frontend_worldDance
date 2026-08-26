export enum EventStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED'
}

export enum ModalityDivision {
  SOLO = 'SOLO',
  DUO = 'DUO',
  GROUP = 'GROUP'
}

export enum ModalityCategory {
  CLASSICAL = 'CLASSICAL',
  CONTEMPORARY = 'CONTEMPORARY',
  FOLKLORE = 'FOLKLORE',
  URBAN = 'URBAN',
  BALLROOM = 'BALLROOM',
  LATIN = 'LATIN'
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: 'Borrador',
  [EventStatus.ACTIVE]: 'Activo',
  [EventStatus.FINISHED]: 'Finalizado',
  [EventStatus.CANCELLED]: 'Cancelado'
};

export const MODALITY_DIVISION_LABELS: Record<ModalityDivision, string> = {
  [ModalityDivision.SOLO]: 'Solo',
  [ModalityDivision.DUO]: 'Dúo',
  [ModalityDivision.GROUP]: 'Grupo'
};

export const MODALITY_CATEGORY_LABELS: Record<ModalityCategory, string> = {
  [ModalityCategory.CLASSICAL]: 'Clásico',
  [ModalityCategory.CONTEMPORARY]: 'Contemporáneo',
  [ModalityCategory.FOLKLORE]: 'Folclor',
  [ModalityCategory.URBAN]: 'Urbano',
  [ModalityCategory.BALLROOM]: 'Baile de Salón',
  [ModalityCategory.LATIN]: 'Latino'
};