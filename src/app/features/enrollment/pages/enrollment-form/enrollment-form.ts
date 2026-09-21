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
  // Inyección de servicios necesarios para el proceso de inscripción
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly authService = inject(AuthService);
  private readonly activeRoute = inject(ActivatedRoute);
  private readonly appRouter = inject(Router);
  private readonly modalityService = inject(ModalityService);

  // Diccionarios de mapeo para etiquetas legibles de categoría y división
  readonly categoryLabels = MODALITY_CATEGORY_LABELS;
  readonly divisionLabels = MODALITY_DIVISION_LABELS;

  // Estado reactivo del componente mediante señales (Signals)
  readonly eventId = signal<number | null>(null);
  readonly eventModalitiesList = signal<ModalityResponseDto[]>([]);
  
  // Identificadores y elecciones del usuario para el envío
  selectedModalityId: number | null = null;
  selectedRole: EventRole | null = null;
  
  // Lista de roles disponibles en el evento para selección por el participante
  readonly availableEventRoles: EventRole[] = [
    EventRole.ADMIN,
    EventRole.JURY,
    EventRole.STAFF,
    EventRole.PARTICIPANT,
    EventRole.INSTRUCTOR
  ];

  // Etiquetas traducidas para mostrar en la interfaz de usuario
  readonly roleDisplayLabels: Record<EventRole, string> = {
    [EventRole.ADMIN]: 'Administrador',
    [EventRole.JURY]: 'Jurado',
    [EventRole.STAFF]: 'Staff',
    [EventRole.PARTICIPANT]: 'Participante',
    [EventRole.INSTRUCTOR]: 'Instructor / Coreógrafo'
  };
  
  // Control de estado de la interfaz de usuario
  readonly isRoleDropdownOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  ngOnInit(): void {
    // Obtener los parámetros de ruta y consulta enviados desde la vista de modalidades
    const routeEventIdParameter = this.activeRoute.snapshot.params['eventId'];
    const routeModalityIdQueryParameter = this.activeRoute.snapshot.queryParams['modalityId'];

    if (routeEventIdParameter) {
      const parsedEventId = Number(routeEventIdParameter);
      this.eventId.set(parsedEventId);
      this.loadEventModalities(parsedEventId);
    } else {
      this.errorMessage.set('No se especificó un evento válido.');
    }

    if (routeModalityIdQueryParameter) {
      this.selectedModalityId = Number(routeModalityIdQueryParameter);
    }
  }

  /**
   * Carga la lista de modalidades asignadas al evento desde el servicio.
   * Permite obtener los detalles de la modalidad preseleccionada.
   */
  loadEventModalities(targetEventId: number): void {
    this.modalityService.getModalitiesByEventId(targetEventId).subscribe({
      next: (retrievedModalities) => {
        this.eventModalitiesList.set(retrievedModalities);
      },
      error: (modalityFetchError) => {
        console.error('Error al cargar las modalidades del evento:', modalityFetchError);
        this.errorMessage.set('No se pudieron cargar las modalidades del evento.');
      }
    });
  }

  /**
   * Alterna la visibilidad del menú desplegable de roles.
   */
  toggleRoleDropdown(): void {
    this.isRoleDropdownOpen.update(previousState => !previousState);
  }

  /**
   * Selecciona el rol elegido por el usuario para el evento.
   */
  selectRole(selectedEventRole: EventRole): void {
    this.selectedRole = selectedEventRole;
    this.isRoleDropdownOpen.set(false);
  }

  /**
   * Retorna el objeto completo de la modalidad seleccionada si está disponible.
   */
  getSelectedModalityDetails(): ModalityResponseDto | null {
    if (!this.selectedModalityId) return null;
    return this.eventModalitiesList().find(modality => modality.id === this.selectedModalityId) || null;
  }

  /**
   * Retorna una etiqueta formateada descriptiva con la información relevante de la modalidad seleccionada.
   */
  getSelectedModalityLabel(): string {
    const selectedModality = this.getSelectedModalityDetails();
    if (!selectedModality) {
      return this.selectedModalityId 
        ? `Modalidad #${this.selectedModalityId}` 
        : 'Modalidad no especificada';
    }
    
    const categoryName = this.categoryLabels[selectedModality.category] || selectedModality.category;
    const divisionName = this.divisionLabels[selectedModality.division] || selectedModality.division;
    
    return `${categoryName} · ${divisionName} · ${selectedModality.style} (${selectedModality.minAge}-${selectedModality.maxAge} años)`;
  }

  /**
   * Retorna la etiqueta visible del rol actualmente seleccionado.
   */
  getSelectedRoleLabel(): string {
    if (!this.selectedRole) return 'Selecciona tu rol';
    return this.roleDisplayLabels[this.selectedRole];
  }

  /**
   * Valida y envía la solicitud de inscripción al servicio backend.
   */
  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.selectedModalityId) {
      this.errorMessage.set('No se identificó la modalidad seleccionada. Por favor regresa al evento e intenta de nuevo.');
      return;
    }

    if (!this.selectedRole) {
      this.errorMessage.set('Debes seleccionar un rol para el evento.');
      return;
    }

    const currentAuthenticatedUser = this.authService.getCurrentUser();
    if (!currentAuthenticatedUser) {
      this.errorMessage.set('Debes iniciar sesión para inscribirte.');
      return;
    }

    const currentTargetEventId = this.eventId();
    if (!currentTargetEventId) {
      this.errorMessage.set('No hay un evento válido.');
      return;
    }

    this.isLoading.set(true);

    const createEnrollmentPayload: CreateEnrollmentRequest = {
      userId: currentAuthenticatedUser.id,
      eventId: currentTargetEventId,
      modalityId: this.selectedModalityId,
      roleInEvent: this.selectedRole
    };

    this.enrollmentService.createEnrollment(createEnrollmentPayload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('¡Inscripción enviada con éxito! Revisa tu portal de competidor para subir la pista musical si aplica.');
        setTimeout(() => {
          this.appRouter.navigate(['/enrollment/my']);
        }, 2000);
      },
      error: (enrollmentApiError) => {
        this.isLoading.set(false);
        const backendMessage = enrollmentApiError.error?.message || 'Hubo un error al procesar tu inscripción. Intenta de nuevo.';
        this.errorMessage.set(backendMessage);
        console.error('Error al registrar inscripción:', enrollmentApiError);
      }
    });
  }
}
