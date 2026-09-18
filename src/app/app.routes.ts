import { Routes } from '@angular/router';
import { AuthGuard } from './features/auth/guards/auth.guard';
import { RedirectGuard } from './features/auth/guards/redirect.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [RedirectGuard],
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'events',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/events/events.routes').then(m => m.EVENTS_ROUTES)
  },
  {
    path: 'enrollment',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/enrollment/enrollment.routes').then(m => m.ENROLLMENT_ROUTES)
  },
  {
    path: 'scoring',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/scoring/scoring.routes').then(m => m.SCORING_ROUTES)
  },
  {
    path: 'stream',
    loadChildren: () => import('./features/streaming/streaming.routes').then(m => m.STREAMING_ROUTES)
  },
  {
    path: 'music',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/music/music.routes').then(m => m.MUSIC_ROUTES)
  },
  {
    path: 'schedule',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/scheduling/scheduling.routes').then(m => m.SCHEDULING_ROUTES)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'reports',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES)
  },
  {
    path: 'rankings',
    loadComponent: () => import('./pages/rankings/rankings').then(m => m.RankingsComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent)
  }
];
