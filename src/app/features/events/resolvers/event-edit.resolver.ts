import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { EventResponseDto } from '../models/event.model';
import { EventService } from '../services/event';

/**
 * Valida el :id antes de activar la ruta de edición y precarga el evento.
 * Si el id es inválido (p. ej. "undefined") o el evento no existe, redirige
 * a /events sin llegar a montar el componente, evitando el "rebote" visible.
 */
export const eventEditResolver: ResolveFn<EventResponseDto | RedirectCommand> = (route) => {
  const eventService = inject(EventService);
  const router = inject(Router);

  const idParam = route.paramMap.get('id');
  const eventId = Number(idParam);

  if (!idParam || isNaN(eventId)) {
    return new RedirectCommand(router.parseUrl('/events'));
  }

  return eventService.getEventById(eventId).pipe(
    catchError(() => of(new RedirectCommand(router.parseUrl('/events'))))
  );
};
