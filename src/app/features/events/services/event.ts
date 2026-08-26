import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventRequestDto, EventResponseDto } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly apiUrl = 'http://localhost:8080/api/events'; // Ajustar según backend

  constructor(private http: HttpClient) {}

  getEvents(): Observable<EventResponseDto[]> {
    return this.http.get<EventResponseDto[]>(this.apiUrl);
  }

  getEventById(id: number): Observable<EventResponseDto> {
    return this.http.get<EventResponseDto>(`${this.apiUrl}/${id}`);
  }

  createEvent(event: EventRequestDto): Observable<EventResponseDto> {
    return this.http.post<EventResponseDto>(this.apiUrl, event);
  }

  updateEvent(id: number, event: EventRequestDto): Observable<EventResponseDto> {
    return this.http.put<EventResponseDto>(`${this.apiUrl}/${id}`, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}