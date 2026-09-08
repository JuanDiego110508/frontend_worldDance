import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EventRequestDto, EventResponseDto, HttpGlobalResponse } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly http = inject(HttpClient);
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
