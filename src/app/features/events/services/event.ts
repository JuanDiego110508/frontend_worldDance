import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EventRequestDto, EventResponseDto, EventStatusFilter, HttpGlobalResponse, PageResponseDto } from '../models/event.model';
import { EventStatus } from '../enums/event-enums';
import { AuthService } from '../../auth/services/auth.service';
import { isSameUser, resolveEventOwnerId } from '../utils/event-normalize';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/events`;

  private readonly eventsSignal = signal<EventResponseDto[]>([]);
  readonly events = this.eventsSignal.asReadonly();

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'No fue posible comunicarse con el servidor de eventos.';
    return throwError(() => new Error(message));
  }

  getEvents(): Observable<EventResponseDto[]> {
    return this.http.get<HttpGlobalResponse<EventResponseDto[]>>(`${this.apiUrl}/getEvents`).pipe(
      map(res => res.data ?? []),
      tap(events => this.eventsSignal.set(events)),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Listado paginado (catálogo público + "Mis Eventos"). No usa el signal `events`
   * (reservado para consumidores que necesitan el set completo, p. ej. my-streams) —
   * el componente que pagina mantiene su propio estado local por página.
   *
   * Si el backend todavía no tiene el endpoint `/events/page` desplegado (404),
   * cae de vuelta a `/events/getEvents` y pagina/filtra en el cliente, para que
   * la lista de eventos no deje de funcionar mientras se actualiza el backend.
   */
  getEventsPage(page: number, size: number, filter: EventStatusFilter): Observable<PageResponseDto<EventResponseDto>> {
    return this.http.get<HttpGlobalResponse<PageResponseDto<EventResponseDto>>>(`${this.apiUrl}/page`, {
      params: { page: page.toString(), size: size.toString(), filter }
    }).pipe(
      map(res => res.data),
      catchError(err => err instanceof HttpErrorResponse && err.status === 404
        ? this.getEventsPageFallback(page, size, filter)
        : this.handleError(err))
    );
  }

  private getEventsPageFallback(page: number, size: number, filter: EventStatusFilter): Observable<PageResponseDto<EventResponseDto>> {
    return this.getEvents().pipe(
      map(all => {
        const userId = this.authService.getCurrentUser()?.id != null ? Number(this.authService.getCurrentUser()!.id) : null;
        const isMine = (e: EventResponseDto) => userId !== null && isSameUser(userId, resolveEventOwnerId(e));

        const visible = all.filter(e => e.status === EventStatus.ACTIVE || isMine(e));
        const filtered = filter === 'ACTIVE'
          ? visible.filter(e => e.status === EventStatus.ACTIVE)
          : filter === 'INACTIVE'
            ? visible.filter(e => e.status !== EventStatus.ACTIVE)
            : filter === 'MINE'
              ? all.filter(e => isMine(e))
              : visible;

        const start = page * size;
        const content = filtered.slice(start, start + size);
        return {
          content,
          page,
          size,
          totalElements: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / size)),
          last: start + size >= filtered.length
        };
      }),
      catchError(err => this.handleError(err))
    );
  }

  getEventById(eventId: number): Observable<EventResponseDto> {
    return this.http.get<HttpGlobalResponse<EventResponseDto>>(`${this.apiUrl}/${eventId}`).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  createEvent(event: EventRequestDto): Observable<EventResponseDto> {
    return this.http.post<HttpGlobalResponse<EventResponseDto>>(`${this.apiUrl}/create`, event).pipe(
      map(res => res.data),
      tap(created => this.eventsSignal.update(list => [...list, created])),
      catchError(err => this.handleError(err))
    );
  }

  /** El backend identifica el evento a actualizar por nombre (query param), no por id. */
  updateEvent(nameEvent: string, event: EventRequestDto): Observable<EventResponseDto> {
    return this.http.patch<HttpGlobalResponse<EventResponseDto>>(`${this.apiUrl}/update`, event, {
      params: { nameEvent }
    }).pipe(
      map(res => res.data),
      tap(updated => this.eventsSignal.update(list => list.map(e => (e.name === nameEvent ? updated : e)))),
      catchError(err => this.handleError(err))
    );
  }

  deleteEvent(eventId: number): Observable<void> {
    return this.http.delete<HttpGlobalResponse<unknown>>(`${this.apiUrl}/delete`, {
      params: { eventId: eventId.toString() }
    }).pipe(
      map(() => void 0),
      tap(() => this.eventsSignal.update(list => list.filter(e => e.idEvent !== eventId))),
      catchError(err => this.handleError(err))
    );
  }
}
