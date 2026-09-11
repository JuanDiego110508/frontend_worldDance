import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../auth/services/auth.service';
import { EventService } from '../../../events/services/event';
import { EventResponseDto } from '../../../events/models/event.model';
import { StreamService } from '../../services/stream.service';

type SessionCheck = 'checking' | 'ready' | 'missing';

/** Objeto JSON crudo tal como puede llegar del backend, sin asumir un casing fijo de sus llaves. */
type RawEvent = Record<string, unknown>;

/** Lee `idEvent` tolerando que el backend lo devuelva en camelCase o PascalCase (`idEvent`/`IdEvent`). */
function resolveIdEvent(raw: RawEvent): number | null {
  const value = raw['idEvent'] ?? raw['IdEvent'];
  return value != null ? Number(value) : null;
}

/**
 * Lee el id del organizador probando todos los nombres de propiedad razonables y ambos casings:
 * el DTO real del backend puede variar entre `ownerId`, `OwnerId`, `organizerId`/`OrganizerId` o
 * incluso `userId`/`UserId` según la versión del microservicio.
 */
function resolveOwnerId(raw: RawEvent): number | null {
  const value =
    raw['ownerId'] ?? raw['OwnerId'] ??
    raw['organizerId'] ?? raw['OrganizerId'] ??
    raw['userId'] ?? raw['UserId'];
  return value != null ? Number(value) : null;
}

/**
 * Landing de "Administración de Streams": lista SOLO los eventos del usuario autenticado (su
 * `ownerId`) para que elija cuál configurar/operar en `/stream/admin/:eventId`.
 *
 * La lectura de `idEvent`/`ownerId` es tolerante al casing exacto que use el backend (ver
 * `resolveIdEvent`/`resolveOwnerId`) y la comparación contra el usuario en sesión se normaliza con
 * `Number(...)` en ambos lados, para no depender de que todo el pipeline (JWT decodificado, JSON
 * del backend, caché en localStorage) use consistentemente `number` en vez de `string`.
 */
@Component({
  selector: 'app-my-streams',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-streams.html',
  styleUrls: ['./my-streams.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyStreamsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly streamService = inject(StreamService);

  private readonly allEvents = signal<EventResponseDto[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  /** Por eventId: si ya existe una sesión de transmisión configurada en ms-notification-streaming. */
  private readonly sessionStatus = signal<Record<number, SessionCheck>>({});

  /**
   * Eventos del usuario en sesión, con `idEvent`/`ownerId` ya normalizados a `number` (sin
   * importar el casing original del JSON) para que el resto del componente y la plantilla puedan
   * seguir leyéndolos en camelCase sin condicionales.
   */
  readonly filteredEvents = computed<EventResponseDto[]>(() => {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (currentUserId == null) return [];
    const normalizedUserId = Number(currentUserId);

    const result: EventResponseDto[] = [];
    for (const event of this.allEvents()) {
      const raw = event as unknown as RawEvent;
      const idEvent = resolveIdEvent(raw);
      const ownerId = resolveOwnerId(raw);

      if (idEvent != null && ownerId === normalizedUserId) {
        result.push({ ...event, idEvent, ownerId });
      }
    }
    return result;
  });

  ngOnInit(): void {
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.allEvents.set(events);
        this.isLoading.set(false);
        this.checkSessionStatus(this.filteredEvents());
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible cargar tus eventos.');
        this.isLoading.set(false);
      }
    });
  }

  /** true si el evento aún no tiene una sesión de transmisión inicializada (no confundir con "checking"). */
  needsSetup(eventId: number): boolean {
    return this.sessionStatus()[eventId] === 'missing';
  }

  isCheckingSetup(eventId: number): boolean {
    return this.sessionStatus()[eventId] === 'checking';
  }

  /**
   * Evita pasarle al pipe `date` un valor ausente o no parseable: el propio DatePipe puede lanzar
   * si recibe una fecha inválida, así que se valida antes de intentar formatear en la plantilla.
   */
  hasValidStartDate(event: EventResponseDto): boolean {
    return !!event.startDate && !isNaN(new Date(event.startDate).getTime());
  }

  private checkSessionStatus(events: EventResponseDto[]): void {
    events.forEach(event => {
      const eventId = event.idEvent;
      this.sessionStatus.update(current => ({ ...current, [eventId]: 'checking' }));

      this.streamService.getAdminEvent(eventId).subscribe({
        next: () => this.sessionStatus.update(current => ({ ...current, [eventId]: 'ready' })),
        error: () => this.sessionStatus.update(current => ({ ...current, [eventId]: 'missing' }))
      });
    });
  }
}
