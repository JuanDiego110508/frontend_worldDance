import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SchedulingService } from '../../services/scheduling.service';
import { ModalityService } from '../../../events/services/modality';
import { ScheduleGenerationResponseDto, ScheduleStatus } from '../../models/scheduling.interface';
import { ModalityResponseDto } from '../../../events/models/modality.model';
import { finalize } from 'rxjs';
import { ScheduleTimelineComponent } from '../../components/schedule-timeline/schedule-timeline';
import { EnrollmentService } from '../../../enrollment/services/enrollment.service';

@Component({
  selector: 'app-schedule-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ScheduleTimelineComponent],
  templateUrl: './schedule-manager.html',
  styleUrl: './schedule-manager.scss'
})
export class ScheduleManagerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly schedulingService = inject(SchedulingService);
  private readonly modalityService = inject(ModalityService);
  private readonly enrollmentService = inject(EnrollmentService);

  eventId = signal<number | null>(null);
  schedule = signal<ScheduleGenerationResponseDto | null>(null);
  modalities = signal<ModalityResponseDto[]>([]);
  
  // Expose enum values as properties to avoid template strict mode errors
  readonly STATUS_DRAFT = ScheduleStatus.DRAFT;
  readonly STATUS_ACTIVE = ScheduleStatus.ACTIVE;
  readonly STATUS_FINISHED = ScheduleStatus.FINISHED;

  get currentStatus(): ScheduleStatus | null {
    const s = this.schedule();
    if (s && s.schedules && s.schedules.length > 0) {
      return s.schedules[0].status;
    }
    return null;
  }

  isLoading = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  isActivatingAgent = signal<boolean>(false);
  agentActivated = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Form values
  durationMinutes: number = 5;
  transitionMinutes: number = 2;
  sortingStrategy: string = 'NEWEST_FIRST';
  stageNames: string = '';
  notes: string = '';

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('eventId');
      if (id) {
        this.eventId.set(Number(id));
        this.loadModalities();
        this.loadSchedule();
      }
    });
  }

  loadModalities() {
    const id = this.eventId();
    if (!id) return;
    this.modalityService.getModalitiesByEventId(id).subscribe({
      next: (res) => this.modalities.set(res),
      error: (err) => console.error('Error cargando modalidades:', err)
    });
  }

  loadSchedule() {
    const id = this.eventId();
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    
    this.schedulingService.getScheduleByEvent(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.schedule.set(res);
        },
        error: (err) => {
          // If schedule doesn't exist, we just leave it null
          this.schedule.set(null);
        }
      });
  }

  moveModalityUp(index: number) {
    if (index === 0) return;
    const current = [...this.modalities()];
    const temp = current[index - 1];
    current[index - 1] = current[index];
    current[index] = temp;
    this.modalities.set(current);
  }

  moveModalityDown(index: number) {
    const current = [...this.modalities()];
    if (index === current.length - 1) return;
    const temp = current[index + 1];
    current[index + 1] = current[index];
    current[index] = temp;
    this.modalities.set(current);
  }

  generateSchedule() {
    const id = this.eventId();
    if (!id) return;

    // Validations
    if (this.durationMinutes == null || this.durationMinutes < 1 || this.durationMinutes > 120) {
      this.errorMessage.set('La duración por presentación debe estar entre 1 y 120 minutos.');
      this.successMessage.set(null);
      return;
    }

    if (this.transitionMinutes == null || this.transitionMinutes < 0 || this.transitionMinutes > 60) {
      this.errorMessage.set('El tiempo de transición debe estar entre 0 y 60 minutos.');
      this.successMessage.set(null);
      return;
    }

    if (this.modalities().length === 0) {
      this.errorMessage.set('Debe haber al menos una modalidad registrada en el evento para poder generar el cronograma.');
      this.successMessage.set(null);
      return;
    }

    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const modalityOrder = this.modalities().map(m => m.id);
    const stages = this.stageNames 
      ? this.stageNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : undefined;

    this.schedulingService.generateSchedule({
      eventId: id,
      defaultDurationMinutes: this.durationMinutes,
      transitionMinutes: this.transitionMinutes,
      sortingStrategy: this.sortingStrategy,
      modalityOrder: modalityOrder,
      stageNames: stages,
      notes: this.notes || undefined
    })
    .pipe(finalize(() => this.isGenerating.set(false)))
    .subscribe({
      next: (res) => {
        this.schedule.set(res);
        this.successMessage.set('Cronograma generado correctamente.');
        // Auto-scroll para que el usuario vea el timeline recién generado inmediatamente
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      },
      error: (err) => {
        this.errorMessage.set('Error al generar el cronograma: ' + (err.error?.message || err.message));
      }
    });
  }

  /**
   * Otorga al agente IA (cuenta WD_AGENT_EMAIL) el rol ADMIN sobre este evento
   * (POST /enrollments/event/{eventId}/agent-admin). Solo el dueño del evento
   * puede hacerlo; una vez activado, el agente puede generar/editar el
   * cronograma del evento cuando se lo pidan por el chat.
   */
  activateAgent() {
    const id = this.eventId();
    if (!id) return;

    this.isActivatingAgent.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.enrollmentService.activateAgentForEvent(id)
      .pipe(finalize(() => this.isActivatingAgent.set(false)))
      .subscribe({
        next: () => {
          this.agentActivated.set(true);
          this.successMessage.set('Agente IA activado: ya puede generar o editar el cronograma de este evento desde el chat.');
        },
        error: (err) => {
          this.errorMessage.set('No se pudo activar el agente: ' + (err.error?.message || err.message));
        }
      });
  }

  updateStatus(status: ScheduleStatus) {
    const id = this.eventId();
    if (!id) return;

    this.isLoading.set(true);
    this.schedulingService.updateScheduleStatus(id, status)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.schedule.set(res);
          this.successMessage.set(`Estado del cronograma actualizado a ${status}.`);
        },
        error: (err) => {
          this.errorMessage.set('Error al actualizar el estado: ' + (err.error?.message || err.message));
        }
      });
  }

  deleteSchedule() {
    const id = this.eventId();
    if (!id) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este cronograma? Esta acción no se puede deshacer.')) return;

    this.isLoading.set(true);
    this.schedulingService.deleteSchedule(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.schedule.set(null);
          this.successMessage.set('Cronograma eliminado exitosamente.');
        },
        error: (err) => {
          this.errorMessage.set('Error al eliminar el cronograma: ' + (err.error?.message || err.message));
        }
      });
  }
}
