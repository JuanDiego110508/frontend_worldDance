import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EventResponseDto } from '../../models/event.model';
import { EventService } from '../../services/event';
import { AuthService } from '../../../auth/services/auth.service';

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
  eventsList = computed(() => this.eventService.events());

  currentUserId = computed<number | null>(() => {
    const user = this.authService.getCurrentUser();
    return user ? user.id : null;
  });

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

  filteredEvents = computed<EventResponseDto[]>(() => {
    const term = this.removeAccents(this.searchTerm().trim());
    const events = this.eventsList();

    if (!term) return events;

    return events.filter((event: EventResponseDto) => {
      const nameStr = this.removeAccents(event.name);
      const location = this.removeAccents(event.location);
      const description = this.removeAccents(event.description);

      return nameStr.includes(term) || location.includes(term) || description.includes(term);
    });
  });

  isOwner(event: EventResponseDto): boolean {
    const userId = this.currentUserId();
    return userId !== null && userId !== undefined && event.ownerId === userId;
  }

  onDeleteEvent(event: EventResponseDto): void {
    if (!event.idEvent) return;

    if (confirm(`¿Estás seguro de eliminar el evento "${event.name}"?`)) {
      this.eventService.deleteEvent(event.idEvent).subscribe({
        error: (err) => {
          alert(err?.message ?? 'Error al eliminar el evento');
        }
      });
    }
  }
}