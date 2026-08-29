import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../services/event';
import { AuthService } from '../../../auth/services/auth.service';
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
  originalEventName: string = '';
  
  statusOptions = Object.keys(EventStatus).map((key) => ({
    value: key,
    label: EVENT_STATUS_LABELS[key as EventStatus]
  }));

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  private initForm(): void {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
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

  private formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  }

  private formatToIsoDateTime(val: string): string {
    if (!val) return '';
    if (val.includes('T')) {
      return val.length === 16 ? `${val}:00` : val;
    }
    return `${val}T00:00:00`;
  }

  private loadEventData(id: number): void {
    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.originalEventName = event.name || event.title || '';
        this.eventForm.patchValue({
          name: this.originalEventName,
          description: event.description,
          startDate: this.formatDateForInput(event.startDate),
          endDate: this.formatDateForInput(event.endDate),
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

    const formValue = this.eventForm.value;
    const currentUser = this.authService.getCurrentUser();
    const ownerId = currentUser ? currentUser.id : 1;

    const dto: EventRequestDto = {
      ownerId,
      name: formValue.name,
      description: formValue.description,
      startDate: this.formatToIsoDateTime(formValue.startDate),
      endDate: this.formatToIsoDateTime(formValue.endDate),
      location: formValue.location,
      status: formValue.status
    };

    if (this.isEditMode) {
      const nameParam = this.originalEventName || dto.name;
      this.eventService.updateEvent(nameParam, dto).subscribe({
        next: () => this.router.navigate(['/events']),
        error: (err) => {
          const errMsg = err?.error?.message || err?.message || 'Error al actualizar evento';
          alert(errMsg);
        }
      });
    } else {
      this.eventService.createEvent(dto).subscribe({
        next: () => this.router.navigate(['/events']),
        error: (err) => {
          const errMsg = err?.error?.message || err?.message || 'Error al crear evento';
          alert(errMsg);
        }
      });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.eventForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}