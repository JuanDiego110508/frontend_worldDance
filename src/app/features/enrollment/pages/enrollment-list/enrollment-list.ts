import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollmentResponseDto, ENROLLMENT_STATUS, EnrollmentStatus } from '../../models/enrollment.interface';
import { EventService } from '../../../events/services/event';
import { EventResponseDto } from '../../../events/models/event.model';
import { AuthService } from '../../../auth/services/auth.service';
import { isSameUser, resolveEventOwnerId } from '../../../events/utils/event-normalize';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './enrollment-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentListComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly eventService = inject(EventService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  enrollments = signal<EnrollmentResponseDto[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');

  myEvents = signal<EventResponseDto[]>([]);
  isLoadingEvents = signal<boolean>(true);
  selectedEventId = signal<number | null>(null);
  statusFilter = signal<string>('all');

  isDropdownOpen = signal<boolean>(false);

  readonly statusOptions = ENROLLMENT_STATUS;

  selectedEvent = computed<EventResponseDto | null>(() => {
    const id = this.selectedEventId();
    return id != null ? this.myEvents().find(e => e.idEvent === id) ?? null : null;
  });

  filteredEnrollments = computed(() => {
    const status = this.statusFilter();
    const list = this.enrollments();
    return status === 'all' ? list : list.filter(e => e.status === status);
  });

  ngOnInit(): void {
    const routeEventId = Number(this.route.snapshot.params['eventId']);
    if (routeEventId) {
      this.selectedEventId.set(routeEventId);
    }
    this.loadMyEvents();
  }

  /** Trae los eventos del organizador logueado para el selector. */
  private loadMyEvents(): void {
    this.isLoadingEvents.set(true);
    const userId = this.authService.getCurrentUser()?.id != null ? Number(this.authService.getCurrentUser()!.id) : null;

    this.eventService.getEvents().subscribe({
      next: (events) => {
        const mine = events.filter(e => isSameUser(userId, resolveEventOwnerId(e)));
        this.myEvents.set(mine);
        this.isLoadingEvents.set(false);

        if (this.selectedEventId() != null) {
          this.loadEnrollments();
        } else if (mine.length === 1) {
          this.onEventChange(mine[0].idEvent);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        this.errorMessage.set('No fue posible cargar tus eventos.');
        this.isLoadingEvents.set(false);
        this.isLoading.set(false);
        console.error('Error loading my events:', error);
      }
    });
  }

  onEventChange(eventId: number): void {
    this.isDropdownOpen.set(false);
    this.selectedEventId.set(eventId);
    this.router.navigate(['/enrollment/event', eventId]);
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    const eventId = this.selectedEventId();
    if (eventId == null) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService.getEnrollmentsByEvent(eventId).subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar las inscripciones');
        this.isLoading.set(false);
        console.error('Error loading enrollments:', error);
      }
    });
  }

  private updateStatus(enrollmentId: number, newStatus: EnrollmentStatus, reason?: string): void {
    this.enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus, reason).subscribe({
      next: (updated) => {
        const list = this.enrollments();
        const index = list.findIndex(e => e.enrollmentId === updated.enrollmentId);
        if (index !== -1) {
          const newList = [...list];
          newList[index] = updated;
          this.enrollments.set(newList);
        }
      },
      error: (error) => {
        console.error('Error updating enrollment status:', error);
        const message = error?.status === 403
          ? 'Solo el organizador del evento puede aprobar o rechazar inscripciones.'
          : (error?.error?.message ?? 'Error al actualizar el estado de la inscripción.');
        alert(message);
      }
    });
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  getStatusLabel(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }

  participantName(enrollment: EnrollmentResponseDto): string {
    const p = enrollment.participant;
    if (!p) return `Usuario #${enrollment.userId}`;
    const fullName = [p.name, p.lastName].filter(Boolean).join(' ').trim();
    return fullName || `Usuario #${enrollment.userId}`;
  }

  approve(enrollment: EnrollmentResponseDto): void {
    this.updateStatus(enrollment.enrollmentId, 'APPROVED');
  }

  reject(enrollment: EnrollmentResponseDto): void {
    const reason = prompt('Indica el motivo del rechazo (obligatorio):');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Debes indicar una justificación para rechazar la inscripción.');
      return;
    }
    this.updateStatus(enrollment.enrollmentId, 'REJECTED', reason.trim());
  }
}
