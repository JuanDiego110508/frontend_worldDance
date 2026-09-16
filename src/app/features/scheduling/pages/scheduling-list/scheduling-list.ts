import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EventResponseDto, EventStatusFilter } from '../../../events/models/event.model';
import { EventService } from '../../../events/services/event';
import { AuthService } from '../../../auth/services/auth.service';
import { isSameUser, resolveEventId, resolveEventOwnerId } from '../../../events/utils/event-normalize';
import { EVENT_STATUS_LABELS } from '../../../events/enums/event-enums';

const CARD_IMAGES = Array.from({ length: 8 }, (_, i) => `events/dance-${String(i + 1).padStart(2, '0')}.jpg`);

@Component({
  selector: 'app-scheduling-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './scheduling-list.html',
  styleUrl: './scheduling-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulingListComponent implements OnInit, OnDestroy {
  private eventService = inject(EventService);
  private authService = inject(AuthService);

  readonly pageSize = 9;
  readonly statusLabels = EVENT_STATUS_LABELS;

  searchTerm = signal<string>('');
  statusFilter = signal<EventStatusFilter>('ALL');
  currentPage = signal<number>(0);
  totalPages = signal<number>(0);
  totalElements = signal<number>(0);
  isLoading = signal<boolean>(false);
  loadError = signal<string>('');

  events = signal<EventResponseDto[]>([]);
  counts = signal<{ all: number; active: number; inactive: number; mine: number }>({ all: 0, active: 0, inactive: 0, mine: 0 });

  private readonly imageAssignments = new Map<number, string>();

  currentUserId = computed<number | null>(() => {
    const user = this.authService.getCurrentUser();
    return user?.id != null ? Number(user.id) : null;
  });

  private removeAccents(text: string | undefined | null): string {
    if (!text) return '';
    return text.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase();
  }

  filteredEvents = computed<EventResponseDto[]>(() => {
    const term = this.removeAccents(this.searchTerm().trim());
    const events = this.events();
    if (!term) return events;
    return events.filter(event => {
      const nameStr = this.removeAccents(event.name);
      const location = this.removeAccents(event.location);
      const description = this.removeAccents(event.description);
      return nameStr.includes(term) || location.includes(term) || description.includes(term);
    });
  });

  ngOnInit(): void {
    this.loadPage();
    this.loadCounts();
  }

  ngOnDestroy(): void {
    // Component cleanup
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.eventService.getEventsPage(this.currentPage(), this.pageSize, this.statusFilter()).subscribe({
      next: (pageResult) => {
        const normalized = pageResult.content.map(event => {
          const id = resolveEventId(event) ?? event.idEvent;
          // Pre-assign random image for this event if not already assigned
          if (id && !this.imageAssignments.has(id)) {
            this.imageAssignments.set(id, CARD_IMAGES[Math.floor(Math.random() * CARD_IMAGES.length)]);
          }
          return {
            ...event,
            idEvent: id,
            ownerId: resolveEventOwnerId(event) ?? event.ownerId
          };
        });
        this.events.set(normalized);
        this.totalPages.set(pageResult.totalPages);
        this.totalElements.set(pageResult.totalElements);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'No fue posible cargar los eventos.');
        this.isLoading.set(false);
      }
    });
  }

  private loadCounts(): void {
    if (this.currentUserId() === null) return;
    forkJoin({
      all: this.eventService.getEventsPage(0, 1, 'ALL'),
      active: this.eventService.getEventsPage(0, 1, 'ACTIVE'),
      inactive: this.eventService.getEventsPage(0, 1, 'INACTIVE'),
      mine: this.eventService.getEventsPage(0, 1, 'MINE')
    }).subscribe({
      next: ({ all, active, inactive, mine }) => {
        this.counts.set({
          all: all.totalElements,
          active: active.totalElements,
          inactive: inactive.totalElements,
          mine: mine.totalElements
        });
      },
      error: () => { }
    });
  }

  setStatusFilter(filter: EventStatusFilter): void {
    if (this.statusFilter() === filter) return;
    this.statusFilter.set(filter);
    this.currentPage.set(0);
    this.loadPage();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadPage();
  }

  cardImage(event: EventResponseDto): string {
    const id = event.idEvent ?? 0;
    // La asignación se hace en loadPage(), aquí solo leemos para evitar mutar estado en la vista
    return this.imageAssignments.get(id) || CARD_IMAGES[0];
  }

  eventCode(event: EventResponseDto): string {
    return '#EVT-' + String(event.idEvent ?? 0).padStart(3, '0');
  }

  isOwner(event: EventResponseDto): boolean {
    return isSameUser(this.currentUserId(), event.ownerId);
  }
}
