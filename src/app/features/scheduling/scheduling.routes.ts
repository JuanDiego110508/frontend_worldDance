import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard';

export const SCHEDULING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/scheduling-list/scheduling-list').then(m => m.SchedulingListComponent)
  },
  {
    path: 'admin/:eventId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/schedule-manager/schedule-manager').then(m => m.ScheduleManagerComponent)
  },
  {
    path: 'view/:eventId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/schedule-viewer/schedule-viewer').then(m => m.ScheduleViewerComponent)
  }
];
