import { EvaluationStatus, ResultStatus } from '../enums/scoring-enums';

/** Refleja CriterionScore embedded del backend. */
export interface CriterionScore {
  criterionName: string;
  percentage: number;
  score: number;
}

/** Refleja CriterionScoreRequest del backend. */
export interface CriterionScoreRequest {
  criterionName: string;
  percentage: number;
  score: number;
}

/** Refleja CreateEvaluationRequest del backend. */
export interface CreateEvaluationRequest {
  scores: CriterionScoreRequest[];
  observations?: string;
}

/** Refleja UpdateEvaluationRequest del backend (misma forma que Create). */
export interface UpdateEvaluationRequest {
  scores: CriterionScoreRequest[];
  observations?: string;
}

/** Refleja EvaluationResponse del backend. */
export interface EvaluationResponse {
  id: string;
  evaluationId: string;
  eventId: string;
  modalityId: string;
  enrollmentId: string;
  totalScore: number;
  scores: CriterionScore[];
  observations: string;
  createdAt: string;
  updatedAt: string;
}

/** Refleja ResultResponse del backend. */
export interface ResultResponse {
  id: string;
  eventId: string;
  modalityId: string;
  enrollmentId: string;
  participantName: string;
  finalScore: number;
  ranking: number;
  status: ResultStatus;
  publishedAt: string;
  createdAt: string;
}

/** Modelo de vista para la tabla de scoring-history (combina datos de evaluación + evento). */
export interface ScoringHistoryEntry {
  id: string;
  participantName: string;
  participantType: string;
  eventName: string;
  category: string;
  categoryClass: string;
  date: string;
  totalScore: number;
  eventId: string;
  modalityId: string;
  enrollmentId: string;
  evaluationId?: string;
}

export { EvaluationStatus, ResultStatus };
