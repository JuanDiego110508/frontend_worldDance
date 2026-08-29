import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';
import { EventRequestDto, EventResponseDto, HttpGlobalResponse, EventStatus } from '../models/event.model';

export const MOCK_EVENTS: EventResponseDto[] = [
  {
    id: 1,
    IdEvent: 1,
    idEvent: 1,
    name: 'Campeonato Nacional de Salsa',
    title: 'Campeonato Nacional de Salsa',
    description: 'El evento de salsa más grande del año con jurados internacionales y competencias por categorías.',
    ownerId: 1, 
    startDate: '2026-04-15T09:00:00',
    endDate: '2026-04-17T18:00:00',
    location: 'Bogotá, Colombia',
    status: 'ACTIVE' as EventStatus
  },
  {
    id: 2,
    IdEvent: 2,
    idEvent: 2,
    name: 'Festival Urbano Dance Clash',
    title: 'Festival Urbano Dance Clash',
    description: 'Batallas 1v1 y crews de Hip Hop, Breaking y Popping con talleres exclusivos.',
    ownerId: 99,
    startDate: '2026-05-10T09:00:00',
    endDate: '2026-05-11T18:00:00',
    location: 'Medellín, Colombia',
    status: 'DRAFT' as EventStatus
  },
  {
    id: 3,
    IdEvent: 3,
    idEvent: 3,
    name: 'Open Internacional de Tango',
    title: 'Open Internacional de Tango',
    description: 'Competencia oficial de Tango de Pista y Tango Escenario con orquesta en vivo.',
    ownerId: 1,
    startDate: '2026-06-01T09:00:00',
    endDate: '2026-06-03T18:00:00',
    location: 'Cali, Colombia',
    status: 'FINISHED' as EventStatus
  }
];

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  events = signal<EventResponseDto[]>(MOCK_EVENTS);

  private normalizeEvent(event: EventResponseDto): EventResponseDto {
    const parsedId = event.IdEvent ?? event.idEvent ?? event.id ?? 0;
    return {
      ...event,
      id: parsedId,
      IdEvent: parsedId,
      idEvent: parsedId,
      title: event.name || event.title || ''
    };
  }

  getEvents(): Observable<EventResponseDto[]> {
    return this.http.get<HttpGlobalResponse<EventResponseDto[]>>(`${this.apiUrl}/getEvents`).pipe(
      map(res => {
        if (res && res.data && res.data.length > 0) {
          const normalized = res.data.map(e => this.normalizeEvent(e));
          this.events.set(normalized);
          return normalized;
        }
        return this.events();
      }),
      catchError(err => {
        console.warn('Backend /events no responde o está en desarrollo. Usando lista de eventos local:', err);
        return of(this.events());
      })
    );
  }

  getEventById(id: number | string): Observable<EventResponseDto> {
    const numId = Number(id);
    const inMemory = this.events().find(e => (e.id === numId || e.IdEvent === numId || e.idEvent === numId));
    
    if (inMemory) {
      return of(inMemory);
    }

    return this.getEvents().pipe(
      map(events => {
        const found = events.find(e => (e.id === numId || e.IdEvent === numId || e.idEvent === numId));
        if (!found) {
          throw new Error(`Evento con ID ${id} no encontrado`);
        }
        return found;
      })
    );
  }

  createEvent(event: EventRequestDto): Observable<EventResponseDto> {
    return this.http.post<HttpGlobalResponse<EventResponseDto>>(`${this.apiUrl}/create`, event).pipe(
      map(res => {
        const newEvent = this.normalizeEvent(res.data);
        this.events.update(list => [...list, newEvent]);
        return newEvent;
      }),
      catchError(err => {
        console.warn('Backend offline, creando evento localmente:', err);
        const newEvent: EventResponseDto = {
          id: Date.now(),
          IdEvent: Date.now(),
          idEvent: Date.now(),
          ownerId: event.ownerId || 1,
          name: event.name,
          title: event.name,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          status: event.status
        };
        this.events.update(list => [...list, newEvent]);
        return of(newEvent);
      })
    );
  }

  updateEvent(nameEvent: string, event: EventRequestDto): Observable<EventResponseDto> {
    const params = { nameEvent };
    return this.http.patch<HttpGlobalResponse<EventResponseDto>>(`${this.apiUrl}/update`, event, { params }).pipe(
      map(res => {
        const updated = this.normalizeEvent(res.data);
        this.events.update(list => list.map(e => (e.name === nameEvent || e.title === nameEvent) ? updated : e));
        return updated;
      }),
      catchError(err => {
        console.warn('Backend offline, actualizando evento localmente:', err);
        let updated: EventResponseDto = {
          id: 1,
          ownerId: event.ownerId || 1,
          name: event.name,
          title: event.name,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          status: event.status
        };
        this.events.update(list => list.map(e => {
          if (e.name === nameEvent || e.title === nameEvent) {
            updated = { ...e, ...event, title: event.name };
            return updated;
          }
          return e;
        }));
        return of(updated);
      })
    );
  }

  deleteEvent(eventId: number, ownerId: number): Observable<HttpGlobalResponse<any>> {
    const params = { eventId: eventId.toString(), ownerId: ownerId.toString() };
    return this.http.delete<HttpGlobalResponse<any>>(`${this.apiUrl}/delete`, { params }).pipe(
      tap(() => {
        this.events.update(list => list.filter(e => (e.id ?? e.IdEvent) !== eventId));
      }),
      catchError(err => {
        console.warn('Backend offline, eliminando evento localmente:', err);
        this.events.update(list => list.filter(e => (e.id ?? e.IdEvent) !== eventId));
        return of({ data: null, message: 'Evento eliminado localmente' });
      })
    );
  }
}
