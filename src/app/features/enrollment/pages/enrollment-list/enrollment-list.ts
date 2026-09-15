import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollmentResponseDto, ENROLLMENT_STATUS, EnrollmentStatus } from '../../models/enrollment.interface';
import { MODALITY_CATEGORY_LABELS } from '../../../events/enums/event-enums';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './enrollment-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentListComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly route = inject(ActivatedRoute);

  enrollments = signal<EnrollmentResponseDto[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  
  eventId = signal<number | null>(null);
  statusFilter = signal<string>('all');
  selectedCategory = signal<string>('');
  
  isDropdownOpen = signal<boolean>(false);

  readonly statusOptions = ENROLLMENT_STATUS;
  readonly categoryLabels: Record<string, string> = MODALITY_CATEGORY_LABELS;
  readonly categoryOptions = Object.keys(MODALITY_CATEGORY_LABELS) as (keyof typeof MODALITY_CATEGORY_LABELS)[];

  filteredEnrollments = computed(() => {
    const status = this.statusFilter();
    const category = this.selectedCategory();
    let list = this.enrollments();
    if (status !== 'all') {
      list = list.filter(e => e.status === status);
    }
    if (category) {
      list = list.filter(e => e.modalityCategory === category);
    }
    return list;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.params['eventId'];
    if (id) {
      this.eventId.set(Number(id));
    }
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    const eventId = this.eventId() || undefined;
    
    this.enrollmentService.getEnrollments(eventId).subscribe({
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

  updateStatus(enrollmentId: number, newStatus: EnrollmentStatus): void {
    this.enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus).subscribe({
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
        alert('Error al actualizar el estado de la inscripción');
      }
    });
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.isDropdownOpen.set(false);
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  getStatusLabel(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }

  approve(enrollment: EnrollmentResponseDto): void {
    this.updateStatus(enrollment.enrollmentId, 'APPROVED');
  }

  reject(enrollment: EnrollmentResponseDto): void {
    if (confirm('¿Estás seguro de rechazar esta inscripción?')) {
      this.updateStatus(enrollment.enrollmentId, 'REJECTED');
    }
  }
}
