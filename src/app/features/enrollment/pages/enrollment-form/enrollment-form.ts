import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { EnrollmentService, CreateEnrollmentRequest } from '../../services/enrollment.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ModalityService } from '../../../events/services/modality';
import { ModalityResponseDto } from '../../../events/models/modality.model';
import { MODALITY_CATEGORY_LABELS, MODALITY_DIVISION_LABELS } from '../../../events/enums/event-enums';
import { EventRole } from '../../models/enrollment.interface';

@Component({
  selector: 'app-enrollment-form',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './enrollment-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentFormComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalityService = inject(ModalityService);

  readonly categoryLabels = MODALITY_CATEGORY_LABELS;
  readonly divisionLabels = MODALITY_DIVISION_LABELS;

  eventId = signal<number | null>(null);
  modalities = signal<ModalityResponseDto[]>([]);
  selectedModalityId: number | null = null;
  selectedRole: EventRole | null = null;
  
  readonly roles: EventRole[] = [
    EventRole.ADMIN,
    EventRole.JURY,
    EventRole.STAFF,
    EventRole.PARTICIPANT,
    EventRole.INSTRUCTOR
  ];

  readonly roleLabels: Record<EventRole, string> = {
    [EventRole.ADMIN]: 'Administrador',
    [EventRole.JURY]: 'Jurado',
    [EventRole.STAFF]: 'Staff',
    [EventRole.PARTICIPANT]: 'Participante',
    [EventRole.INSTRUCTOR]: 'Instructor / Coreógrafo'
  };
  
  isDropdownOpen = signal<boolean>(false);
  isRoleDropdownOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    const id = this.route.snapshot.params['eventId'];
    if (id) {
      this.eventId.set(Number(id));
      this.loadModalities(Number(id));
    } else {
      this.errorMessage.set('No se especificó un evento válido.');
    }
  }

  loadModalities(eventId: number): void {
    this.modalityService.getModalitiesByEventId(eventId).subscribe({
      next: (data) => this.modalities.set(data),
      error: (err) => {
        console.error('Error loading modalities', err);
        this.errorMessage.set('No se pudieron cargar las modalidades del evento.');
      }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
    if (this.isDropdownOpen()) this.isRoleDropdownOpen.set(false);
  }

  toggleRoleDropdown(): void {
    this.isRoleDropdownOpen.update(v => !v);
    if (this.isRoleDropdownOpen()) this.isDropdownOpen.set(false);
  }

  selectModality(modalityId: number): void {
    this.selectedModalityId = modalityId;
    this.isDropdownOpen.set(false);
  }

  selectRole(role: EventRole): void {
    this.selectedRole = role;
    this.isRoleDropdownOpen.set(false);
  }

  getSelectedModalityLabel(): string {
    if (!this.selectedModalityId) return 'Selecciona tu categoría y división';
    const mod = this.modalities().find(m => m.id === this.selectedModalityId);
    if (!mod) return 'Selecciona tu categoría y división';
    return `${this.categoryLabels[mod.category]} · ${this.divisionLabels[mod.division]} · ${mod.style} (${mod.minAge}-${mod.maxAge} años)`;
  }

  getSelectedRoleLabel(): string {
    if (!this.selectedRole) return 'Selecciona tu rol';
    return this.roleLabels[this.selectedRole];
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.selectedModalityId) {
      this.errorMessage.set('Debes seleccionar una modalidad.');
      return;
    }

    if (!this.selectedRole) {
      this.errorMessage.set('Debes seleccionar un rol para el evento.');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.errorMessage.set('Debes iniciar sesión para inscribirte.');
      return;
    }

    const eventId = this.eventId();
    if (!eventId) {
      this.errorMessage.set('No hay un evento válido.');
      return;
    }

    this.isLoading.set(true);

    const data: CreateEnrollmentRequest = {
      userId: user.id,
      eventId: eventId,
      modalityId: this.selectedModalityId,
      roleInEvent: this.selectedRole
    };

    this.enrollmentService.createEnrollment(data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('¡Inscripción enviada con éxito! Revisa tu portal de competidor para subir la pista musical si aplica.');
        setTimeout(() => {
          this.router.navigate(['/enrollment/my']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading.set(false);
        const backendMsg = error.error?.message || 'Hubo un error al procesar tu inscripción. Intenta de nuevo.';
        this.errorMessage.set(backendMsg);
        console.error('Enrollment error:', error);
      }
    });
  }
}
