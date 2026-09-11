import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EventResponseDto } from '../../models/event.model';
import { EventService } from '../../services/event';
import { AuthService } from '../../../auth/services/auth.service';
import { isSameUser, resolveEventId, resolveEventOwnerId } from '../../utils/event-normalize';
import { EventStatus } from '../../enums/event-enums';

export type EventStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterLink],
  templateUrl: './event-list.html',
  styleUrls: ['./event-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent implements OnInit {
  private eventService = inject(EventService);
  private authService = inject(AuthService);

  searchTerm = signal<string>('');
  statusFilter = signal<EventStatusFilter>('ALL');

  /** Normaliza idEvent/ownerId (casing y tipo) antes de que la vista los use. */
  eventsList = computed<EventResponseDto[]>(() =>
    this.eventService.events().map(event => ({
      ...event,
      idEvent: resolveEventId(event) ?? event.idEvent,
      ownerId: resolveEventOwnerId(event) ?? event.ownerId
    }))
  );

  currentUserId = computed<number | null>(() => {
    const user = this.authService.getCurrentUser();
    return user?.id != null ? Number(user.id) : null;
  });

  /**
   * Catálogo público: un visitante/usuario general solo ve eventos ACTIVOS.
   * El propietario siempre ve sus propios eventos sin importar el estado
   * (borrador, finalizado, cancelado) para poder gestionarlos.
   */
  visibleEvents = computed<EventResponseDto[]>(() =>
    this.eventsList().filter(event => event.status === EventStatus.ACTIVE || this.isOwner(event))
  );

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      error: (err) => console.log('Backend no disponible, usando datos de estado local:', err)
    });
  }

  private removeAccents(text: string | undefined | null): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  /** Tabs de "Mis Eventos": filtra por estado dentro del conjunto ya visible para el usuario. */
  private matchesStatusFilter(event: EventResponseDto): boolean {
    switch (this.statusFilter()) {
      case 'ACTIVE':
        return event.status === EventStatus.ACTIVE;
      case 'INACTIVE':
        return event.status !== EventStatus.ACTIVE;
      default:
        return true;
    }
  }

  filteredEvents = computed<EventResponseDto[]>(() => {
    const term = this.removeAccents(this.searchTerm().trim());
    const events = this.visibleEvents().filter(event => this.matchesStatusFilter(event));

    if (!term) return events;

    return events.filter((event: EventResponseDto) => {
      const nameStr = this.removeAccents(event.name);
      const location = this.removeAccents(event.location);
      const description = this.removeAccents(event.description);

      return nameStr.includes(term) || location.includes(term) || description.includes(term);
    });
  });

  setStatusFilter(filter: EventStatusFilter): void {
    this.statusFilter.set(filter);
  }

  isOwner(event: EventResponseDto): boolean {
    return isSameUser(this.currentUserId(), event.ownerId);
  }

  onDeleteEvent(event: EventResponseDto): void {
    if (!event.idEvent) return;

    if (confirm(`¿Estás seguro de eliminar el evento "${event.name}"?`)) {
      this.eventService.deleteEvent(event.idEvent).subscribe({
        next: () => alert('Evento eliminado exitosamente.'),
        error: (err) => {
          alert(err?.message ?? 'Error al eliminar el evento');
        }
      });
    }
  }
}