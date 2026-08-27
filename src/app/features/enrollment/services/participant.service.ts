import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Participant } from '../models/participant.interface';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/enrollment/participants';
  private useMock = true;

  getParticipants(): Observable<Participant[]> {
    if (this.useMock) {
      return of(this.mockParticipants()).pipe(delay(500));
    }
    return this.http.get<Participant[]>(this.apiUrl);
  }

  getParticipantById(id: number): Observable<Participant> {
    if (this.useMock) {
      const participant = this.mockParticipants().find(p => p.id === id);
      return of(participant || this.mockParticipants()[0]).pipe(delay(300));
    }
    return this.http.get<Participant>(`${this.apiUrl}/${id}`);
  }

  createParticipant(data: Omit<Participant, 'id'>): Observable<Participant> {
    if (this.useMock) {
      const newParticipant: Participant = {
        id: Math.floor(Math.random() * 1000),
        ...data
      };
      return of(newParticipant).pipe(delay(800));
    }
    return this.http.post<Participant>(this.apiUrl, data);
  }

  updateParticipant(id: number, data: Partial<Participant>): Observable<Participant> {
    if (this.useMock) {
      const participant = this.mockParticipants().find(p => p.id === id);
      const updated = { ...participant, ...data } as Participant;
      return of(updated).pipe(delay(600));
    }
    return this.http.put<Participant>(`${this.apiUrl}/${id}`, data);
  }

  private mockParticipants(): Participant[] {
    return [
      { id: 1, fullName: 'Juan Pérez', email: 'juan@ejemplo.com', phone: '3001234567', institution: 'Academia Danza' },
      { id: 2, fullName: 'María Gómez', email: 'maria@ejemplo.com', phone: '3007654321', institution: 'Ballet Colombia' },
      { id: 3, fullName: 'Grupo Étnico', email: 'grupo@ejemplo.com', phone: '3109876543', institution: 'Folclor Vivo' }
    ];
  }
}