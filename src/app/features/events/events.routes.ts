import { Routes } from '@angular/router';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/event-list/event-list').then(m => m.EventListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/event-form/event-form').then(m => m.EventFormComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/event-form/event-form').then(m => m.EventFormComponent)
  },
  {
    path: ':id/modalities',
    loadComponent: () => import('./pages/modality-config/modality-config').then(m => m.ModalityConfigComponent)
  }
];
