import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard';

export const STREAMING_ROUTES: Routes = [
  {
    path: 'admin/:eventId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/stream-admin/stream-admin').then(m => m.StreamAdminComponent)
  },
  {
    path: 'watch/:eventId',
    loadComponent: () => import('./pages/stream-viewer/stream-viewer').then(m => m.StreamViewerComponent)
  }
];
