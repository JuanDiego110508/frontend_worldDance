import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../services/event';
import { EventStatus, EVENT_STATUS_LABELS } from '../../enums/event-enums';
import { EventRequestDto } from '../../models/event.model';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss'
})
export class EventForm implements OnInit {
  eventForm!: FormGroup;
  isEditMode = false;
  eventId: number | null = null;
  
  statusOptions = Object.keys(EventStatus).map((key) => ({
    value: key,
    label: EVENT_STATUS_LABELS[key as EventStatus]
  }));

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  private initForm(): void {
    this.eventForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      location: ['', Validators.required],
      status: [EventStatus.DRAFT, Validators.required]
    });
  }

  private checkEditMode(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.eventId = Number(idParam);
      this.loadEventData(this.eventId);
    }
  }

  private loadEventData(id: number): void {
    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.eventForm.patchValue({
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          status: event.status
        });
      },
      error: (err) => {
        console.error('Error al cargar datos del evento', err);
        this.router.navigate(['/events']);
      }
    });
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const formValue: EventRequestDto = this.eventForm.value;

    if (this.isEditMode && this.eventId) {
      this.eventService.updateEvent(this.eventId, formValue).subscribe({
        next: () => this.router.navigate(['/events']),
        error: (err) => console.error('Error al actualizar evento', err)
      });
    } else {
      this.eventService.createEvent(formValue).subscribe({
        next: () => this.router.navigate(['/events']),
        error: (err) => console.error('Error al crear evento', err)
      });
    }
  }

  
  isFieldInvalid(field: string): boolean {
    const control = this.eventForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}