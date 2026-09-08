import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EnrollmentService } from '../../services/enrollment.service';
import { EventRole } from '../../models/enrollment.interface';
import { ModalityService } from '../../../events/services/modality';
import { ModalityResponseDto } from '../../../events/models/modality.model';
import { MODALITY_CATEGORY_LABELS, MODALITY_DIVISION_LABELS } from '../../../events/enums/event-enums';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-enrollment-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './enrollment-form.html',
  styleUrls: ['./enrollment-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentFormComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly modalityService = inject(ModalityService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categoryLabels = MODALITY_CATEGORY_LABELS;
  readonly divisionLabels = MODALITY_DIVISION_LABELS;

  eventId = signal<number | null>(null);
  modalities = signal<ModalityResponseDto[]>([]);
  selectedModalityId: number | null = null;

  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['eventId'];
    if (!idParam) {
      this.errorMessage.set('No se especificó un evento para inscribirse.');
      return;
    }
    const eventId = Number(idParam);
    this.eventId.set(eventId);
    this.loadModalities(eventId);
  }

  private loadModalities(eventId: number): void {
    this.isLoading.set(true);
    this.modalityService.getModalitiesByEventId(eventId).subscribe({
      next: (data) => {
        this.modalities.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible cargar las modalidades del evento');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    const eventId = this.eventId();
    const user = this.authService.getCurrentUser();

    if (!eventId || !this.selectedModalityId) {
      this.errorMessage.set('Selecciona una modalidad para inscribirte.');
      return;
    }

    if (!user) {
      this.errorMessage.set('Debes iniciar sesión para inscribirte.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.enrollmentService.createEnrollment({
      userId: user.id,
      eventId,
      modalityId: this.selectedModalityId,
      roleInEvent: EventRole.PARTICIPANT
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set('¡Inscripción realizada exitosamente!');
        setTimeout(() => this.router.navigate(['/enrollment/my']), 1500);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(error?.message ?? 'Error al crear la inscripción');
      }
    });
  }
}
