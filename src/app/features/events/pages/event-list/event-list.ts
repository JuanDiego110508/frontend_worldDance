import { Component, signal, computed, inject, OnInit } from '@angular/core';
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
  styleUrls: ['./event-list.scss']
})
export class EventList implements OnInit {
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
      const nameStr = this.removeAccents(event.name || event.title);
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
    const eventId = event.id ?? event.IdEvent ?? event.idEvent;
    const ownerId = event.ownerId;
    const eventName = event.name || event.title;

    if (!eventId) return;

    if (confirm(`¿Estás seguro de eliminar el evento "${eventName}"?`)) {
      this.eventService.deleteEvent(eventId, ownerId).subscribe({
        next: (res) => {
          if (res && res.message) {
            alert(res.message);
          }
        },
        error: (err) => {
          const errMsg = err?.error?.message || err?.message || 'Error al eliminar el evento';
          alert(errMsg);
        }
      });
    }
  }
}