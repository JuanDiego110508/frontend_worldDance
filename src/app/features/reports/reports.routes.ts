import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/reports-dashboard/reports-dashboard').then(m => m.ReportsDashboardComponent)
  },
  {
    path: ':eventId',
    loadComponent: () => import('./pages/event-report-detail/event-report-detail').then(m => m.EventReportDetailComponent)
  }
];
