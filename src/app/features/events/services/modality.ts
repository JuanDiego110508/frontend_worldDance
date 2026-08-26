import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModalityRequestDto, ModalityResponseDto } from '../models/modality.model';

@Injectable({
  providedIn: 'root'
})
export class ModalityService {
  private readonly apiUrl = 'http://localhost:8080/api/modalities'; // Ajustar según backend

  constructor(private http: HttpClient) {}

  getModalitiesByEventId(eventId: number): Observable<ModalityResponseDto[]> {
    return this.http.get<ModalityResponseDto[]>(`${this.apiUrl}/event/${eventId}`);
  }

  createModality(modality: ModalityRequestDto): Observable<ModalityResponseDto> {
    return this.http.post<ModalityResponseDto>(this.apiUrl, modality);
  }

  updateModality(id: number, modality: ModalityRequestDto): Observable<ModalityResponseDto> {
    return this.http.put<ModalityResponseDto>(`${this.apiUrl}/${id}`, modality);
  }

  deleteModality(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}