import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EnrollmentService } from '../../services/enrollment.service';
import { Enrollment, ENROLLMENT_STATUS } from '../../models/enrollment.interface';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-enrollment.html',
  styleUrls: ['./my-enrollment.scss']
})
export class MyEnrollmentsComponent implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private authService = inject(AuthService);

  enrollments = signal<Enrollment[]>([]);
  filteredEnrollments = signal<Enrollment[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  statusFilter = signal<string>('all');
  searchTerm = signal<string>('');

  statusOptions = ENROLLMENT_STATUS;

  ngOnInit(): void {
    this.loadMyEnrollments();
  }

  loadMyEnrollments(): void {
    this.isLoading.set(true);
    const user = this.authService.getCurrentUser();
    const userId = user?.id || 1;

    this.enrollmentService.getMyEnrollments(userId).subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar tus inscripciones');
        this.isLoading.set(false);
        console.error('Error loading my enrollments:', error);
      }
    });
  }

  applyFilters(): void {
    const list = this.enrollments();
    const status = this.statusFilter();
    const search = this.searchTerm().toLowerCase();

    let filtered = list;

    if (status !== 'all') {
      filtered = filtered.filter(e => e.status === status);
    }

    if (search) {
      filtered = filtered.filter(e =>
        e.eventName?.toLowerCase().includes(search) ||
        e.categoryName?.toLowerCase().includes(search)
      );
    }

    this.filteredEnrollments.set(filtered);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.applyFilters();
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.applyFilters();
  }

  getStatusClass(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option?.class || '';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option?.label || status;
  }

  cancelEnrollment(id: number): void {
    if (confirm('¿Estás seguro de cancelar esta inscripción?')) {
      this.enrollmentService.deleteEnrollment(id).subscribe({
        next: () => {
          const newList = this.enrollments().filter(e => e.id !== id);
          this.enrollments.set(newList);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error canceling enrollment:', error);
          alert('Error al cancelar la inscripción');
        }
      });
    }
  }
}