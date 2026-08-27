import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EnrollmentService } from '../../services/enrollment.service';
import { ParticipantService } from '../../services/participant.service';
import { Participant } from '../../models/participant.interface';

@Component({
  selector: 'app-enrollment-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './enrollment-form.html',
  styleUrls: ['./enrollment-form.scss']
})
export class EnrollmentFormComponent implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private participantService = inject(ParticipantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /* Datos del formulario */
  participant: Partial<Participant> = {
    fullName: '',
    email: '',
    phone: '',
    institution: ''
  };

  enrollment = {
    participantId: 0,
    categoryId: 0,
    eventId: 0
  };

  /* Estados */
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  eventId = signal<number | null>(null);

  /* Lista de categorías (mock) */
  categories = signal([
    { id: 1, name: 'Danza Contemporánea' },
    { id: 2, name: 'Ballet' },
    { id: 3, name: 'Folclor' },
    { id: 4, name: 'Danza Urbana' },
    { id: 5, name: 'Jazz' }
  ]);

  ngOnInit(): void {
    const id = this.route.snapshot.params['eventId'];
    if (id) {
      this.eventId.set(Number(id));
      this.enrollment.eventId = Number(id);
    }
  }

  onSubmit(): void {
    /* Validar campos obligatorios */
    if (!this.participant.fullName || !this.participant.email || !this.enrollment.categoryId) {
      this.errorMessage.set('Por favor completa todos los campos obligatorios');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    /* Primero crear el participante */
    this.participantService.createParticipant(this.participant as Omit<Participant, 'id'>).subscribe({
      next: (newParticipant) => {
        /* Luego crear la inscripción */
        this.enrollment.participantId = newParticipant.id!;
        this.enrollmentService.createEnrollment(this.enrollment).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.successMessage.set('¡Inscripción realizada exitosamente!');
            setTimeout(() => {
              this.router.navigate(['/enrollment/my']);
            }, 2000);
          },
          error: (error) => {
            this.isSaving.set(false);
            this.errorMessage.set(error.message || 'Error al crear la inscripción');
          }
        });
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(error.message || 'Error al registrar el participante');
      }
    });
  }
}