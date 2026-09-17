import { Component, signal, computed, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EventService } from '../../features/events/services/event';
import { ModalityService } from '../../features/events/services/modality';
import { ScoringService } from '../../features/scoring/services/scoring.service';
import { EventResponseDto } from '../../features/events/models/event.model';
import { ModalityResponseDto } from '../../features/events/models/modality.model';
import { ResultResponse } from '../../features/scoring/models/scoring.model';
import { EnrollmentService } from '../../features/enrollment/services/enrollment.service';
import { EnrollmentResponseDto } from '../../features/enrollment/models/enrollment.interface';

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rankings.html',
  styleUrls: ['./rankings.scss']
})
export class RankingsComponent implements OnInit {
  private eventService = inject(EventService);
  private modalityService = inject(ModalityService);
  private scoringService = inject(ScoringService);
  private enrollmentService = inject(EnrollmentService);
  private elementRef = inject(ElementRef);

  events = signal<EventResponseDto[]>([]);
  modalities = signal<ModalityResponseDto[]>([]);
  enrollments = signal<EnrollmentResponseDto[]>([]);
  results = signal<ResultResponse[]>([]);

  selectedEventId = signal<string>('');
  selectedModalityId = signal<string>('');
  
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  isEventDropdownOpen = signal<boolean>(false);
  isModalityDropdownOpen = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isEventDropdownOpen.set(false);
      this.isModalityDropdownOpen.set(false);
    }
  }

  toggleEventDropdown(event: Event) {
    event.stopPropagation();
    this.isEventDropdownOpen.update(v => !v);
    this.isModalityDropdownOpen.set(false);
  }

  toggleModalityDropdown(event: Event) {
    event.stopPropagation();
    if (!this.selectedEventId() || this.modalities().length === 0) return;
    this.isModalityDropdownOpen.update(v => !v);
    this.isEventDropdownOpen.set(false);
  }

  selectEvent(id: number) {
    this.selectedEventId.set(String(id));
    this.isEventDropdownOpen.set(false);
    this.onEventChange();
  }

  selectModality(id: number) {
    this.selectedModalityId.set(String(id));
    this.isModalityDropdownOpen.set(false);
    this.onModalityChange();
  }

  get selectedEventName(): string {
    const ev = this.events().find(e => String(e.idEvent) === this.selectedEventId());
    return ev ? `${ev.name} (${ev.location})` : 'Elige un evento...';
  }

  get selectedModalityName(): string {
    const mod = this.modalities().find(m => String(m.id) === this.selectedModalityId());
    return mod ? `${mod.style} - ${mod.category} (${mod.division})` : 'Elige una modalidad...';
  }

  publishedResults = computed(() => {
    const enrList = this.enrollments();
    return this.results()
      .filter(r => r.status === 'PUBLISHED')
      .map(r => {
        // Find matching enrollment
        const match = enrList.find(e => String(e.enrollmentId) === String(r.enrollmentId));
        if (match && match.participant) {
          r.participantName = `${match.participant.name} ${match.participant.lastName}`;
        }
        return r;
      })
      .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  });



  ngOnInit(): void {
    this.isLoading.set(true);
    this.eventService.getEvents().subscribe({
      next: (evts) => {
        this.events.set(evts);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onEventChange(): void {
    this.selectedModalityId.set('');
    this.modalities.set([]);
    this.enrollments.set([]);
    this.results.set([]);
    this.errorMessage.set('');

    const eventId = this.selectedEventId();
    if (!eventId) return;

    this.isLoading.set(true);
    
    // Fetch enrollments to get participant names
    this.enrollmentService.getEnrollmentsByEvent(Number(eventId)).subscribe({
      next: (enr) => this.enrollments.set(enr),
      error: () => console.error('Error fetching enrollments')
    });

    this.modalityService.getModalitiesByEventId(Number(eventId)).subscribe({
      next: (mods) => {
        this.modalities.set(mods);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onModalityChange(): void {
    this.results.set([]);
    this.errorMessage.set('');

    const eventId = this.selectedEventId();
    const modalityId = this.selectedModalityId();
    if (!eventId || !modalityId) return;

    this.isLoading.set(true);
    this.scoringService.getResultsByModality(eventId, modalityId).subscribe({
      next: (res) => {
        this.results.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Error al cargar resultados');
        this.isLoading.set(false);
      }
    });
  }
}
