import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EventResponseDto, EventStatusFilter } from '../../models/event.model';
import { EventService } from '../../services/event';
import { AuthService } from '../../../auth/services/auth.service';
import { isSameUser, resolveEventId, resolveEventOwnerId } from '../../utils/event-normalize';
import { EVENT_STATUS_LABELS } from '../../enums/event-enums';

/**
 * El organizador no sube una imagen de portada al crear un evento (no existe ese
 * campo en el backend), así que cada tarjeta recibe una foto cinematográfica al
 * azar de este set (las mismas usadas como mood-board en el diseño de Stitch).
 */
const CARD_IMAGES = Array.from({ length: 8 }, (_, i) => `events/dance-${String(i + 1).padStart(2, '0')}.jpg`);

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './event-list.html',
  styleUrls: ['./event-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent implements OnInit, OnDestroy {
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

  carouselIndex = signal<number>(0);
  private carouselTimer?: ReturnType<typeof setInterval>;
  private readonly imageAssignments = new Map<number, string>();

  currentUserId = computed<number | null>(() => {
    const user = this.authService.getCurrentUser();
    return user?.id != null ? Number(user.id) : null;
  });

  private removeAccents(text: string | undefined | null): string {
    if (!text) return '';
    return text.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase();
  }

  /** La búsqueda solo filtra dentro de la página cargada (el listado ya viene paginado del backend). */
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

  featuredEvents = computed<EventResponseDto[]>(() => this.events().slice(0, 5));

  ngOnInit(): void {
    this.loadPage();
    this.loadCounts();
    this.carouselTimer = setInterval(() => this.nextSlide(), 6000);
  }

  ngOnDestroy(): void {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.eventService.getEventsPage(this.currentPage(), this.pageSize, this.statusFilter()).subscribe({
      next: (pageResult) => {
        const normalized = pageResult.content.map(event => ({
          ...event,
          idEvent: resolveEventId(event) ?? event.idEvent,
          ownerId: resolveEventOwnerId(event) ?? event.ownerId
        }));
        this.events.set(normalized);
        this.totalPages.set(pageResult.totalPages);
        this.totalElements.set(pageResult.totalElements);
        this.carouselIndex.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'No fue posible cargar los eventos.');
        this.isLoading.set(false);
      }
    });
  }

  /** Trae el total de cada pestaña (page=0,size=1) solo para mostrar el contador del pill. */
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
      error: () => { /* los contadores son decorativos; si fallan, simplemente no se muestran */ }
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

  nextSlide(): void {
    const total = this.featuredEvents().length;
    if (total === 0) return;
    this.carouselIndex.update(i => (i + 1) % total);
  }

  prevSlide(): void {
    const total = this.featuredEvents().length;
    if (total === 0) return;
    this.carouselIndex.update(i => (i - 1 + total) % total);
  }

  goToSlide(index: number): void {
    this.carouselIndex.set(index);
  }

  /** Foto al azar, estable durante la sesión (no cambia en cada re-render). */
  cardImage(event: EventResponseDto): string {
    const id = event.idEvent ?? 0;
    let assigned = this.imageAssignments.get(id);
    if (!assigned) {
      assigned = CARD_IMAGES[Math.floor(Math.random() * CARD_IMAGES.length)];
      this.imageAssignments.set(id, assigned);
    }
    return assigned;
  }

  eventCode(event: EventResponseDto): string {
    return '#EVT-' + String(event.idEvent ?? 0).padStart(3, '0');
  }

  isOwner(event: EventResponseDto): boolean {
    return isSameUser(this.currentUserId(), event.ownerId);
  }

  onDeleteEvent(event: EventResponseDto): void {
    if (!event.idEvent) return;
    if (confirm(`¿Estás seguro de eliminar el evento "${event.name}"?`)) {
      this.eventService.deleteEvent(event.idEvent).subscribe({
        next: () => {
          alert('Evento eliminado exitosamente.');
          this.loadPage();
          this.loadCounts();
        },
        error: (err) => alert(err?.message ?? 'Error al eliminar el evento')
      });
    }
  }
}
