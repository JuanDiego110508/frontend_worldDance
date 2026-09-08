import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollmentResponseDto, ENROLLMENT_STATUS, EnrollmentStatus } from '../../models/enrollment.interface';
import { ModalityCategory, MODALITY_CATEGORY_LABELS } from '../../../events/enums/event-enums';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-list.html',
  styleUrls: ['./enrollment-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentListComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly route = inject(ActivatedRoute);

  readonly categoryOptions = Object.values(ModalityCategory);
  readonly categoryLabels = MODALITY_CATEGORY_LABELS;
  readonly statusOptions = ENROLLMENT_STATUS;

  enrollments = signal<EnrollmentResponseDto[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  category = signal<ModalityCategory | null>(null);
  statusFilter = signal<string>('all');

  filteredEnrollments = computed(() => {
    const status = this.statusFilter();
    const list = this.enrollments();
    return status === 'all' ? list : list.filter(e => e.status === status);
  });

  ngOnInit(): void {
    const categoryParam = this.route.snapshot.params['category'] as ModalityCategory | undefined;
    if (categoryParam) {
      this.category.set(categoryParam);
      this.loadEnrollments();
    }
  }

  onCategoryChange(category: ModalityCategory | ''): void {
    this.category.set(category || null);
    if (category) {
      this.loadEnrollments();
    } else {
      this.enrollments.set([]);
    }
  }

  loadEnrollments(): void {
    const category = this.category();
    if (!category) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService.getEnrollmentsByCategory(category).subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message ?? 'Error al cargar las inscripciones');
        this.isLoading.set(false);
      }
    });
  }

  approve(enrollment: EnrollmentResponseDto): void {
    this.enrollmentService.approveOrReject({ enrollmentId: enrollment.enrollmentId, status: 'APPROVED' }).subscribe({
      next: (updated) => this.replaceInList(updated),
      error: (error) => alert(error?.message ?? 'Error al aprobar la inscripción')
    });
  }

  reject(enrollment: EnrollmentResponseDto): void {
    const reason = prompt('Motivo del rechazo (obligatorio):');
    if (!reason) return;

    this.enrollmentService.approveOrReject({ enrollmentId: enrollment.enrollmentId, status: 'REJECTED', reason }).subscribe({
      next: (updated) => this.replaceInList(updated),
      error: (error) => alert(error?.message ?? 'Error al rechazar la inscripción')
    });
  }

  private replaceInList(updated: EnrollmentResponseDto): void {
    this.enrollments.update(list => list.map(e => (e.enrollmentId === updated.enrollmentId ? updated : e)));
  }

  getStatusClass(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.class ?? '';
  }

  getStatusLabel(status: EnrollmentStatus): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }
}
