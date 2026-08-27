import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EnrollmentService } from '../../services/enrollment.service';
import { Enrollment, ENROLLMENT_STATUS } from '../../models/enrollment.interface';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './enrollment-list.html',
  styleUrls: ['./enrollment-list.scss']
})
export class EnrollmentListComponent implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private route = inject(ActivatedRoute);

  enrollments = signal<Enrollment[]>([]);
  filteredEnrollments = signal<Enrollment[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  
  eventId = signal<number | null>(null);
  statusFilter = signal<string>('all');
  searchTerm = signal<string>('');

  statusOptions = ENROLLMENT_STATUS;

  ngOnInit(): void {
    const id = this.route.snapshot.params['eventId'];
    if (id) {
      this.eventId.set(Number(id));
    }
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    const eventId = this.eventId();
    
    this.enrollmentService.getEnrollments(eventId || undefined).subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar las inscripciones');
        this.isLoading.set(false);
        console.error('Error loading enrollments:', error);
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
        e.participant?.fullName?.toLowerCase().includes(search) ||
        e.categoryName?.toLowerCase().includes(search) ||
        e.eventName?.toLowerCase().includes(search)
      );
    }

    this.filteredEnrollments.set(filtered);
  }

  updateStatus(enrollment: Enrollment, newStatus: 'APPROVED' | 'REJECTED'): void {
    this.enrollmentService.updateEnrollmentStatus(enrollment.id!, newStatus).subscribe({
      next: (updated) => {
        const index = this.enrollments().findIndex(e => e.id === updated.id);
        if (index !== -1) {
          const newList = [...this.enrollments()];
          newList[index] = updated;
          this.enrollments.set(newList);
          this.applyFilters();
        }
      },
      error: (error) => {
        console.error('Error updating enrollment status:', error);
        alert('Error al actualizar el estado de la inscripción');
      }
    });
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

  deleteEnrollment(id: number): void {
    if (confirm('¿Estás seguro de eliminar esta inscripción?')) {
      this.enrollmentService.deleteEnrollment(id).subscribe({
        next: () => {
          const newList = this.enrollments().filter(e => e.id !== id);
          this.enrollments.set(newList);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error deleting enrollment:', error);
          alert('Error al eliminar la inscripción');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option?.class || '';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option?.label || status;
  }
}