import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard';

export const MUSIC_ROUTES: Routes = [
  {
    path: ':eventId/:enrollmentId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/music-manager/music-manager').then(m => m.MusicManagerComponent)
  }
];
