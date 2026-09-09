import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollmentResponseDto, ENROLLMENT_STATUS, EnrollmentStatus } from '../../models/enrollment.interface';
import { EventService } from '../../../events/services/event';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-enrollment.html',
  styleUrls: ['./my-enrollment.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyEnrollmentsComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly eventService = inject(EventService);

  enrollments = signal<EnrollmentResponseDto[]>([]);
  eventNames = signal<Record<number, string>>({});
  isLoading = signal(true);
  errorMessage = signal('');
  statusFilter = signal<string>('all');

  statusOptions = ENROLLMENT_STATUS;

  filteredEnrollments = computed(() => {
    const status = this.statusFilter();
    const list = this.enrollments();
    return status === 'all' ? list : list.filter(e => e.status === status);
  });

  ngOnInit(): void {
    this.loadMyEnrollments();
  }

  loadMyEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService.getMyEnrollments().subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.isLoading.set(false);
        this.loadEventNames(data);
      },
      error: (error) => {
        this.errorMessage.set(error?.message ?? 'Error al cargar tus inscripciones');
        this.isLoading.set(false);
      }
    });
  }

  /** Enriquecimiento best-effort: el backend de inscripciones no incluye el nombre del evento. */
  private loadEventNames(enrollments: EnrollmentResponseDto[]): void {
    const uniqueEventIds = [...new Set(enrollments.map(e => e.eventId))];
    if (uniqueEventIds.length === 0) return;

    forkJoin(
      uniqueEventIds.map(id =>
        this.eventService.getEventById(id).pipe(catchError(() => of(null)))
      )
    ).subscribe(events => {
      const names: Record<number, string> = {};
      events.forEach((event, index) => {
        if (event) {
          names[uniqueEventIds[index]] = event.name;
        }
      });
      this.eventNames.set(names);
    });
  }

  eventLabel(eventId: number): string {
    return this.eventNames()[eventId] ?? `Evento #${eventId}`;
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
  }

  getStatusClass(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.class ?? '';
  }

  getStatusLabel(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }
}
