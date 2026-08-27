import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';
import { ModalityRequestDto, ModalityResponseDto } from '../models/modality.model';
import { HttpGlobalResponse } from '../models/event.model';
import { ModalityCategory, ModalityDivision } from '../enums/event-enums';

const MOCK_MODALITIES: ModalityResponseDto[] = [
  { id: 101, eventId: 1, category: ModalityCategory.LATIN, division: ModalityDivision.DUET, minAge: 18, maxAge: 35, style: 'Salsa Caleña' },
  { id: 102, eventId: 1, category: ModalityCategory.URBAN, division: ModalityDivision.SOLO, minAge: 15, maxAge: 30, style: 'Hip Hop Breakdown' },
  { id: 201, eventId: 2, category: ModalityCategory.URBAN, division: ModalityDivision.GROUP, minAge: 12, maxAge: 25, style: 'Hip Hop Crew Showcase' },
  { id: 202, eventId: 2, category: ModalityCategory.CONTEMPORARY, division: ModalityDivision.SOLO, minAge: 16, maxAge: 30, style: 'Contemporáneo Expresivo' },
  { id: 103, eventId: 3, category: ModalityCategory.CLASSICAL, division: ModalityDivision.SOLO, minAge: 10, maxAge: 25, style: 'Tango de Pista' }
];

@Injectable({
  providedIn: 'root'
})
export class ModalityService {
  private readonly apiUrl = `${environment.apiUrl}/modality`;
  private mockList: ModalityResponseDto[] = [...MOCK_MODALITIES];

  constructor(private http: HttpClient) {}

  getModalitiesByEventId(eventId: number): Observable<ModalityResponseDto[]> {
    return this.http.get<HttpGlobalResponse<ModalityResponseDto[]>>(`${this.apiUrl}/getModalitiesByEventId/${eventId}`).pipe(
      map(res => (res && res.data ? res.data : [])),
      catchError(err => {
        console.warn('Backend /modality no responde. Usando modalidades locales:', err);
        return of(this.mockList.filter(m => m.eventId === eventId));
      })
    );
  }

  createModality(eventId: number, modality: ModalityRequestDto): Observable<ModalityResponseDto> {
    return this.http.post<HttpGlobalResponse<ModalityResponseDto>>(`${this.apiUrl}/create/${eventId}`, modality).pipe(
      map(res => res.data),
      catchError(err => {
        console.warn('Backend offline, creando modalidad localmente:', err);
        const newMod: ModalityResponseDto = {
          id: Date.now(),
          eventId: eventId,
          category: modality.category,
          division: modality.division,
          minAge: modality.minAge,
          maxAge: modality.maxAge,
          style: modality.style
        };
        this.mockList.push(newMod);
        return of(newMod);
      })
    );
  }

  updateModality(modalityId: number, modality: ModalityRequestDto): Observable<ModalityResponseDto> {
    return this.http.patch<HttpGlobalResponse<ModalityResponseDto>>(`${this.apiUrl}/update/${modalityId}`, modality).pipe(
      map(res => res.data),
      catchError(err => {
        console.warn('Backend offline, actualizando modalidad localmente:', err);
        const updated: ModalityResponseDto = {
          id: modalityId,
          eventId: modality.eventId || 1,
          category: modality.category,
          division: modality.division,
          minAge: modality.minAge,
          maxAge: modality.maxAge,
          style: modality.style
        };
        this.mockList = this.mockList.map(m => m.id === modalityId ? updated : m);
        return of(updated);
      })
    );
  }

  deleteModality(modalityId: number): Observable<HttpGlobalResponse<any>> {
    return this.http.delete<HttpGlobalResponse<any>>(`${this.apiUrl}/delete/${modalityId}`).pipe(
      catchError(err => {
        console.warn('Backend offline, eliminando modalidad localmente:', err);
        this.mockList = this.mockList.filter(m => m.id !== modalityId);
        return of({ data: null, message: 'Modalidad eliminada' });
      })
    );
  }
}
