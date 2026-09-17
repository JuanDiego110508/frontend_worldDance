import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EnrollmentService } from '../../services/enrollment.service';
import { AuthService } from '../../../auth/services/auth.service';
import { EnrollmentResponseDto, ENROLLMENT_STATUS, EnrollmentStatus } from '../../models/enrollment.interface';
import { MODALITY_CATEGORY_LABELS } from '../../../events/enums/event-enums';
import { EventService } from '../../../events/services/event';

@Component({
  selector: 'app-my-enrollment',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-enrollment.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyEnrollmentsComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly eventService = inject(EventService);
  private readonly authService = inject(AuthService);

  enrollments = signal<EnrollmentResponseDto[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  
  eventsMap = signal<Record<number, string>>({});
  
  statusFilter = signal<string>('all');
  
  readonly statusOptions = ENROLLMENT_STATUS;
  readonly categoryLabels: Record<string, string> = MODALITY_CATEGORY_LABELS;

  filteredEnrollments = computed(() => {
    const status = this.statusFilter();
    const list = this.enrollments();
    return status === 'all' ? list : list.filter(e => e.status === status);
  });

  ngOnInit(): void {
    this.loadMyEnrollments();
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      next: (data) => {
        const map: Record<number, string> = {};
        data.forEach(e => {
          map[e.idEvent] = e.name;
        });
        this.eventsMap.set(map);
      },
      error: (err) => console.error('Error loading events for names', err)
    });
  }

  getEventName(eventId: number): string {
    const name = this.eventsMap()[eventId];
    return name || `Evento #${eventId}`;
  }

  loadMyEnrollments(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.errorMessage.set('Debes iniciar sesión para ver tus inscripciones.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    
    this.enrollmentService.getMyEnrollments().subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar tus inscripciones');
        this.isLoading.set(false);
        console.error('Error loading my enrollments:', error);
      }
    });
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
  }

  getStatusLabel(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }
}
