import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
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
  imports: [CommonModule, FormsModule, RouterLink],
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
  selectedEvent = signal<string>('all');
  selectedDate = signal<string>('');
  sidebarActive = signal<string>('history');
  isLoading = signal<boolean>(true);

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

  /** Historial filtrado por búsqueda, evento y fecha. */
  filteredHistory = computed(() => {
    let entries = this.scoringHistory();
    const term = this.removeAccents(this.searchTerm().trim());
    const event = this.selectedEvent();
    const date = this.selectedDate();

    if (term) {
      entries = entries.filter(e =>
        this.removeAccents(e.participantName).includes(term) ||
        this.removeAccents(e.eventName).includes(term) ||
        this.removeAccents(e.category).includes(term)
      );
    }

    if (event && event !== 'all') {
      entries = entries.filter(e => e.eventName === event);
    }

    if (date) {
      entries = entries.filter(e => e.date.includes(date));
    }

    return entries;
  });

  /** Lista única de nombres de evento para el dropdown de filtro. */
  uniqueEventNames = computed(() => {
    const evts = this.events();
    return evts.map(e => e.name);
  });

  ngOnInit(): void {
    this.loadRealData();
  }

  /**
   * Carga datos reales: 1) eventos, 2) modalidades de cada evento,
   * 3) enrollments por categoría de cada modalidad.
   */
  private loadRealData(): void {
    this.isLoading.set(true);

    // Paso 1: Cargar todos los eventos
    this.eventService.getEvents().subscribe({
      next: (events) => {
        events.forEach(e => this.eventsMap.set(e.idEvent, e));

        if (events.length === 0) {
          this.isLoading.set(false);
          return;
        }

        // Paso 2: Cargar modalidades de cada evento
        const modalityRequests = events.map(e =>
          this.modalityService.getModalitiesByEventId(e.idEvent).pipe(
            catchError(() => of([] as ModalityResponseDto[]))
          )
        );

        forkJoin(modalityRequests).subscribe({
          next: (allModalities) => {
            const allMods: ModalityResponseDto[] = [];
            allModalities.forEach(mods => {
              mods.forEach(m => {
                this.modalitiesMap.set(m.id, m);
                allMods.push(m);
              });
            });

            // Paso 3: Cargar enrollments por cada categoría única
            const uniqueCategories = new Set(allMods.map(m => m.category));
            const categoryRequests = Array.from(uniqueCategories).map(cat =>
              this.enrollmentService.getEnrollmentsByCategory(cat).pipe(
                catchError(() => of([] as EnrollmentResponseDto[]))
              )
            );

            if (categoryRequests.length === 0) {
              this.isLoading.set(false);
              return;
            }

            forkJoin(categoryRequests).subscribe({
              next: (allEnrollments) => {
                const entries: ScoringHistoryEntry[] = [];
                const allEnrolls = allEnrollments.flat();

                allEnrolls.forEach(enrollment => {
                  const event = this.eventsMap.get(enrollment.eventId);
                  const modality = this.modalitiesMap.get(enrollment.modalityId);

                  if (!event || !modality) return;

                  // Solo mostrar participantes aprobados
                  if (enrollment.status !== 'APPROVED') return;

                  const categoryLabel = MODALITY_CATEGORY_LABELS[modality.category] || modality.category;
                  const categoryClass = this.getCategoryClass(modality.category);
                  const division = modality.division || 'SOLO';
                  const participantType = division === 'SOLO' ? 'Soloist'
                    : division === 'DUET' ? 'Duet' : 'Group';

                  entries.push({
                    id: enrollment.enrollmentId.toString(),
                    participantName: `Participant #${enrollment.userId}`,
                    participantType,
                    eventName: event.name,
                    category: categoryLabel.toUpperCase(),
                    categoryClass,
                    date: this.formatDate(enrollment.createdAt || event.startDate),
                    totalScore: 0, // Se llenará cuando haya evaluaciones
                    eventId: event.idEvent.toString(),
                    modalityId: modality.id.toString(),
                    enrollmentId: enrollment.enrollmentId.toString()
                  });
                });

                this.scoringHistory.set(entries);
                this.isLoading.set(false);
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
    this.router.navigate(['/scoring/evaluate', entry.eventId, entry.modalityId, entry.enrollmentId]);
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
