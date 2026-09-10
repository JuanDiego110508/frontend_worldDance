import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard';

export const SCORING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/scoring-history/scoring-history').then(m => m.ScoringHistoryComponent)
  },
  {
    path: 'evaluate/:eventId/:modalityId/:enrollmentId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/evaluation-form/evaluation-form').then(m => m.EvaluationFormComponent)
  },
  {
    path: 'evaluate/:eventId/:modalityId/edit/:evaluationId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/evaluation-form/evaluation-form').then(m => m.EvaluationFormComponent)
  },
  {
    path: 'results/:eventId/:modalityId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/results-view/results-view').then(m => m.ResultsViewComponent)
  }
];
