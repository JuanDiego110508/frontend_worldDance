import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard';

export const ENROLLMENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/enrollment-list/enrollment-list').then(m => m.EnrollmentListComponent)
  },
  {
    path: 'category/:category',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/enrollment-list/enrollment-list').then(m => m.EnrollmentListComponent)
  },
  {
    path: 'new/:eventId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/enrollment-form/enrollment-form').then(m => m.EnrollmentFormComponent)
  },
  {
    path: 'my',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/my-enrollment/my-enrollment').then(m => m.MyEnrollmentsComponent)
  }
];
