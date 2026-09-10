export enum EvaluationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum ResultStatus {
  PUBLISHED = 'PUBLISHED',
  READY = 'READY',
  PENDING = 'PENDING'
}

export enum EvaluationSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PUBLISHED = 'PUBLISHED'
}

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  [EvaluationStatus.IN_PROGRESS]: 'En Progreso',
  [EvaluationStatus.COMPLETED]: 'Completada'
};

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  [ResultStatus.PUBLISHED]: 'Publicado',
  [ResultStatus.READY]: 'Listo',
  [ResultStatus.PENDING]: 'Pendiente'
};

export const SESSION_STATUS_LABELS: Record<EvaluationSessionStatus, string> = {
  [EvaluationSessionStatus.OPEN]: 'Abierta',
  [EvaluationSessionStatus.CLOSED]: 'Cerrada',
  [EvaluationSessionStatus.PUBLISHED]: 'Publicada'
};
