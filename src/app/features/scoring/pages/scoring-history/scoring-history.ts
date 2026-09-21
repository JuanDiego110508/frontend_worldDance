import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ScoringService } from '../../services/scoring.service';
import { AuthService } from '../../../auth/services/auth.service';
import { EventService } from '../../../events/services/event';
import { ModalityService } from '../../../events/services/modality';
import { EnrollmentService } from '../../../enrollment/services/enrollment.service';
import { ScoringHistoryEntry } from '../../models/scoring.model';
import { EventResponseDto } from '../../../events/models/event.model';
import { ModalityResponseDto } from '../../../events/models/modality.model';
import { EnrollmentResponseDto } from '../../../enrollment/models/enrollment.interface';
import { ModalityCategory, MODALITY_CATEGORY_LABELS } from '../../../events/enums/event-enums';

@Component({
  selector: 'app-scoring-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scoring-history.html',
  styleUrls: ['./scoring-history.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringHistoryComponent implements OnInit {
  private readonly scoringService = inject(ScoringService);
  private readonly authService = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly modalityService = inject(ModalityService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly router = inject(Router);

  searchTerm = signal<string>('');
  selectedEvent = signal<string>('');
  selectedModality = signal<string>('');
  selectedDate = signal<string>('');
  sidebarActive = signal<string>('evaluation');
  isLoading = signal<boolean>(true);

  private readonly elementRef = inject(ElementRef);
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
    this.isModalityDropdownOpen.update(v => !v);
    this.isEventDropdownOpen.set(false);
  }

  selectEventFilter(eventName: string) {
    this.selectedEvent.set(eventName);
    this.isEventDropdownOpen.set(false);
  }

  selectModalityFilter(modName: string) {
    this.selectedModality.set(modName);
    this.isModalityDropdownOpen.set(false);
  }

  userName = computed(() => {
    const user = this.authService.getCurrentUser();
    if (!user) return 'Judge';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first} ${last}`.trim() || user.email || 'Judge';
  });

  userInitials = computed(() => {
    const name = this.userName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  events = computed(() => this.eventService.events());

  /** Datos cargados desde el backend (eventos + enrollments). */
  scoringHistory = signal<ScoringHistoryEntry[]>([]);

  /** Mapa de eventos para lookup rápido. */
  private eventsMap = new Map<number, EventResponseDto>();
  /** Mapa de modalidades para lookup rápido. */
  private modalitiesMap = new Map<number, ModalityResponseDto>();

  /** Stats computadas del historial. */
  averageScore = computed(() => {
    const entries = this.scoringHistory();
    const scored = entries.filter(e => e.totalScore > 0);
    if (scored.length === 0) return 0;
    const sum = scored.reduce((acc, e) => acc + e.totalScore, 0);
    return Math.round((sum / scored.length) * 10) / 10;
  });

  totalParticipants = computed(() => this.scoringHistory().length);

  eventsJudged = computed(() => {
    const uniqueEvents = new Set(this.scoringHistory().map(e => e.eventId));
    return uniqueEvents.size;
  });

  nextEvent = computed(() => {
    const evts = this.events();
    if (evts.length > 0) {
      const now = new Date();
      const future = evts.filter(e => new Date(e.endDate) > now);
      if (future.length > 0) return future[0].name;
      return evts[evts.length - 1].name;
    }
    return 'No events';
  });

  /** Historial filtrado por búsqueda, evento, modalidad y fecha. */
  filteredHistory = computed(() => {
    let entries = this.scoringHistory();
    const term = this.removeAccents(this.searchTerm().trim());
    const event = this.selectedEvent();
    const modality = this.selectedModality();
    const date = this.selectedDate();

    if (term) {
      entries = entries.filter(e =>
        this.removeAccents(e.participantName).includes(term) ||
        this.removeAccents(e.eventName).includes(term) ||
        this.removeAccents(e.category).includes(term)
      );
    }

    if (this.sidebarActive() === 'evaluation') {
      // Only show pending evaluations
      entries = entries.filter(e => !e.totalScore || e.totalScore === 0);
    } else {
      // History mode: show completed evaluations
      entries = entries.filter(e => e.totalScore && e.totalScore > 0);
    }

    if (event && event !== '' && event !== 'all') {
      entries = entries.filter(e => e.eventName === event);
    }

    if (modality && modality !== '' && modality !== 'all') {
      entries = entries.filter(e => e.category === modality);
    }

    if (date) {
      entries = entries.filter(e => e.date.includes(date));
    }

    return entries;
  });

  /** Lista única de nombres de evento para el dropdown de filtro. */
  uniqueEventNames = computed(() => {
    const evts = this.events();
    return Array.from(new Set(evts.map(e => e.name)));
  });

  /** Lista única de categorías (modalidades) para el dropdown de filtro. */
  uniqueModalityNames = computed(() => {
    const entries = this.scoringHistory();
    return Array.from(new Set(entries.map(e => e.category)));
  });

  ngOnInit(): void {
    this.loadRealData();
  }

  private loadRealData(): void {
    this.isLoading.set(true);

    // Helper para extraer el ID sin importar cómo venga del backend
    const extractEventId = (evt: any): number => {
      if (evt.idEvent) return evt.idEvent;
      if (evt.id) return evt.id;
      if (evt.IdEvent) return evt.IdEvent;
      if (evt.eventId) return evt.eventId;
      if (evt.event_id) return evt.event_id;
      if (evt.id_event) return evt.id_event;
      return 0;
    };

    const extractEnrollmentId = (enr: any): string => {
      if (enr.enrollmentId) return enr.enrollmentId.toString();
      if (enr.id) return enr.id.toString();
      return '0';
    };

    const user = this.authService.getCurrentUser();
    const userId = user?.id ? Number(user.id) : null;

    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    // Paso 1: Cargar todos los eventos
    this.eventService.getEvents().subscribe({
      next: (allEvents) => {
        if (allEvents.length === 0) {
          console.warn('No events found, aborting.');
          this.isLoading.set(false);
          return;
        }

        // Consultar el rol del usuario en cada evento
        const roleRequests = allEvents.map(e => {
          const eId = extractEventId(e);
          return this.enrollmentService.getUserEventRole(eId, userId).pipe(
            catchError(() => of(null)) // Si falla o no tiene rol, retorna null
          );
        });

        forkJoin(roleRequests).subscribe({
          next: (roles) => {
            const juryEventIds = new Set<number>();
            roles.forEach((role, idx) => {
              if (role && role.roleInEvent === 'JURY') {
                juryEventIds.add(extractEventId(allEvents[idx]));
              }
            });

            // Filtrar solo los eventos donde es JURY
            const events = allEvents.filter(e => juryEventIds.has(extractEventId(e)));
            console.log('1. Events fetched (filtered for jury):', events.length);

            if (events.length === 0) {
              console.warn('No jury events found, aborting.');
              this.isLoading.set(false);
              return;
            }

            events.forEach(e => {
              const eId = extractEventId(e);
              this.eventsMap.set(eId, e);
            });

        // Paso 2: Cargar modalidades de cada evento
        const modalityRequests = events.map(e => {
          const eId = extractEventId(e);
          return this.modalityService.getModalitiesByEventId(eId).pipe(
            catchError(() => of([] as ModalityResponseDto[]))
          );
        });

        forkJoin(modalityRequests).subscribe({
          next: (allModalities) => {
            const allMods: ModalityResponseDto[] = [];
            allModalities.forEach(mods => {
              mods.forEach(m => {
                this.modalitiesMap.set(m.id, m);
                allMods.push(m);
              });
            });

            // Paso 3: Cargar enrollments y resultados por cada modalidad para tener nombres y puntajes
            console.log('2. Modalities fetched. Fetching enrollments and results...');
            const eventEnrollmentRequests = events.map(evt => {
              const evtId = extractEventId(evt);
              return this.enrollmentService.getEnrollmentsByEvent(evtId).pipe(
                catchError((err) => {
                  console.warn(`No se pudieron obtener inscripciones para el evento ${evtId}:`, err);
                  return of([] as EnrollmentResponseDto[]);
                })
              );
            });

            const resultRequests = allMods.map(m => {
              const evtId = extractEventId(this.eventsMap.get(m.eventId) || m as any);
              return this.scoringService.getResultsByModality(evtId.toString(), m.id.toString()).pipe(
                catchError(() => of([] as any[]))
              );
            });

            if (eventEnrollmentRequests.length === 0) {
              console.warn('No enrollment requests to make, aborting.');
              this.isLoading.set(false);
              return;
            }

            forkJoin([
              forkJoin(eventEnrollmentRequests).pipe(catchError(() => of([]))),
              resultRequests.length > 0 ? forkJoin(resultRequests).pipe(catchError(() => of([]))) : of([])
            ]).subscribe({
              next: ([allEnrollments, allResults]) => {
                const entries: ScoringHistoryEntry[] = [];
                const allEnrolls = (allEnrollments as any[]).flat();
                const flatResults = (allResults as any[]).flat();
                
                // Mapa de resultados por enrollmentId
                const resultMap = new Map<string, any>();
                flatResults.forEach(r => resultMap.set(r.enrollmentId?.toString(), r));

                console.log('3. Enrollments fetched:', allEnrolls.length, 'Results fetched:', flatResults.length);

                allEnrolls.forEach((enrollment: any) => {
                  const event = this.eventsMap.get(enrollment.eventId);
                  const modality = this.modalitiesMap.get(enrollment.modalityId);

                  if (!event || !modality) return;

                  const categoryLabel = MODALITY_CATEGORY_LABELS[modality.category] || modality.category;
                  const categoryClass = this.getCategoryClass(modality.category);
                  const division = modality.division || 'SOLO';
                  const participantType = division === 'SOLO' ? 'Soloist' : division === 'DUET' ? 'Duet' : 'Group';

                  const enrId = extractEnrollmentId(enrollment);

                  // Obtener datos del resultado si existe (esto nos da el participantName y el score real)
                  const result = resultMap.get(enrId);
                  const rawEnr = enrollment as any;
                  
                  let displayParticipantName = result?.participantName 
                    || (rawEnr.participant?.name && rawEnr.participant?.lastName ? `${rawEnr.participant.name} ${rawEnr.participant.lastName}` : rawEnr.participant?.name)
                    || rawEnr.userName 
                    || ((rawEnr.firstName && rawEnr.lastName) ? `${rawEnr.firstName} ${rawEnr.lastName}` : null);
                    
                  // Como último recurso, usamos el ID, pero el result debería traer el nombre
                  if (!displayParticipantName) {
                     displayParticipantName = `Participante #${enrollment.userId}`;
                  }

                  entries.push({
                    id: enrId,
                    participantName: displayParticipantName,
                    participantType,
                    eventName: event.name,
                    category: categoryLabel.toUpperCase(),
                    categoryClass,
                    date: this.formatDate(enrollment.createdAt || event.startDate),
                    totalScore: result?.finalScore || 0, // Si tiene puntaje, ya fue evaluado (evita el 409)
                    eventId: extractEventId(event).toString(),
                    modalityId: modality.id.toString(),
                    enrollmentId: enrId
                  });
                });

                this.scoringHistory.set(entries);
                this.isLoading.set(false);
              },
              error: (err) => {
                console.error('Error in forkJoin enrollments/results:', err);
                this.isLoading.set(false);
              }
            });
          },
          error: () => this.isLoading.set(false)
        });
          },
          error: () => this.isLoading.set(false)
        });
      },
      error: (err) => {
        console.log('Backend no disponible:', err);
        this.isLoading.set(false);
      }
    });

  }

  private getCategoryClass(category: ModalityCategory): string {
    switch (category) {
      case ModalityCategory.CONTEMPORARY: return 'contemporary';
      case ModalityCategory.URBAN: return 'urban';
      case ModalityCategory.CLASSICAL: return 'jazz';
      case ModalityCategory.FOLK: return 'traditional';
      case ModalityCategory.BALLROOM: return 'contemporary';
      case ModalityCategory.LATIN: return 'urban';
      default: return 'contemporary';
    }
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private removeAccents(text: string | undefined | null): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  getScoreClass(score: number): string {
    if (score >= 9.0) return 'score-excellent';
    if (score >= 8.0) return 'score-good';
    if (score >= 7.0) return 'score-average';
    if (score === 0) return 'score-pending';
    return 'score-low';
  }

  navigateToEvaluate(entry: ScoringHistoryEntry): void {
    this.router.navigate(['/scoring/evaluate', entry.eventId, entry.modalityId, entry.enrollmentId], {
      state: { eventName: entry.eventName, participantName: entry.participantName }
    });
  }

  navigateToResults(entry: ScoringHistoryEntry): void {
    this.router.navigate(['/scoring/results', entry.eventId, entry.modalityId]);
  }

  onPublishResults(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    alert('Seleccione un evento y modalidad desde la vista de resultados para publicar.');
  }

  setSidebarActive(item: string): void {
    this.sidebarActive.set(item);
    if (item === 'events') {
      this.router.navigate(['/events']);
    }
  }
}
