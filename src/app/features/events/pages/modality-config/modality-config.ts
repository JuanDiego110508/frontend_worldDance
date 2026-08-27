import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { 
  ModalityDivision, 
  ModalityCategory, 
  MODALITY_DIVISION_LABELS, 
  MODALITY_CATEGORY_LABELS 
} from '../../enums/event-enums';
import { ModalityRequestDto, ModalityResponseDto } from '../../models/modality.model';
import { ModalityService } from '../../services/modality';
import { EventService } from '../../services/event';
import { AuthService } from '../../../auth/services/auth.service';
import { EventResponseDto } from '../../models/event.model';

@Component({
  selector: 'app-modality-config',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './modality-config.html',
  styleUrls: ['./modality-config.scss']
})
export class ModalityConfig implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private modalityService = inject(ModalityService);
  private eventService = inject(EventService);
  private authService = inject(AuthService);

  readonly divisionLabels = MODALITY_DIVISION_LABELS;
  readonly categoryLabels = MODALITY_CATEGORY_LABELS;

  eventId = signal<number | null>(null);
  currentEvent = signal<EventResponseDto | null>(null);
  modalities = signal<ModalityResponseDto[]>([]);
  isLoading = signal<boolean>(false);
  editingId = signal<number | null>(null);

  isOwner = computed(() => {
    const user = this.authService.getCurrentUser();
    const event = this.currentEvent();
    if (!user || !event) return false;
    return user.id === event.ownerId;
  });

  divisionOptions = Object.values(ModalityDivision).map(val => ({
    value: val,
    label: MODALITY_DIVISION_LABELS[val]
  }));

  categoryOptions = Object.values(ModalityCategory).map(val => ({
    value: val,
    label: MODALITY_CATEGORY_LABELS[val]
  }));

  modalityForm: FormGroup = this.fb.group({
    category: [ModalityCategory.URBAN, [Validators.required]],
    division: [ModalityDivision.SOLO, [Validators.required]],
    style: ['', [Validators.required, Validators.minLength(2)]],
    minAge: [null, [Validators.required, Validators.min(0)]],
    maxAge: [null, [Validators.required, Validators.min(0)]]
  });

  // Signal reactiva vinculada a los cambios de valor del formulario
  formValues = toSignal(this.modalityForm.valueChanges, {
    initialValue: this.modalityForm.value
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam) {
      const parsedId = Number(idParam);
      if (!isNaN(parsedId)) {
        this.eventId.set(parsedId);
        this.loadEventData(parsedId);
        this.loadModalities(parsedId);
      }
    }
  }

  loadEventData(eventId: number): void {
    this.eventService.getEventById(eventId).subscribe({
      next: (eventData) => this.currentEvent.set(eventData),
      error: (err) => console.error('Error al obtener datos del evento', err)
    });
  }

  loadModalities(eventId: number): void {
    this.isLoading.set(true);
    this.modalityService.getModalitiesByEventId(eventId).subscribe({
      next: (data) => {
        this.modalities.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar modalidades', err);
        this.isLoading.set(false);
      }
    });
  }

  overlappingModality = computed<ModalityResponseDto | null>(() => {
    const formVal = this.formValues();
    if (!formVal || !formVal.category || !formVal.division || formVal.minAge === null || formVal.maxAge === null || formVal.minAge === '' || formVal.maxAge === '') {
      return null;
    }
    const currentEditId = this.editingId();
    const minAge = Number(formVal.minAge);
    const maxAge = Number(formVal.maxAge);

    if (isNaN(minAge) || isNaN(maxAge) || minAge > maxAge) {
      return null;
    }

    const found = this.modalities().find(m => {
      if (currentEditId !== null && m.id === currentEditId) {
        return false;
      }
      
      const isSameCategory = m.category === formVal.category;
      const isSameDivision = m.division === formVal.division;

      if (!isSameCategory || !isSameDivision) {
        return false;
      }

      const existingMin = Number(m.minAge);
      const existingMax = Number(m.maxAge);

      // Verificación de solapamiento de rangos [minAge, maxAge] con [existingMin, existingMax]
      return minAge <= existingMax && maxAge >= existingMin;
    });

    return found || null;
  });

  onSubmit(): void {
    if (this.modalityForm.invalid || this.eventId() === null || !this.isOwner()) return;

    const currentEventId = this.eventId()!;
    const formValue = this.modalityForm.value;

    const minAge = Number(formValue.minAge);
    const maxAge = Number(formValue.maxAge);

    if (minAge > maxAge) {
      alert('La edad mínima no puede ser mayor que la edad máxima.');
      return;
    }

    const overlap = this.overlappingModality();
    if (overlap) {
      const catLabel = this.categoryLabels[overlap.category] || overlap.category;
      const divLabel = this.divisionLabels[overlap.division] || overlap.division;
      alert(`No se puede guardar esta modalidad debido a un solapamiento de edades.\n\nEl rango de edad ingresado (${minAge} - ${maxAge} años) se traslapa con la modalidad existente:\n• Categoría: ${catLabel}\n• División: ${divLabel}\n• Rango Ocupado: ${overlap.minAge} a ${overlap.maxAge} años (${overlap.style})\n\nPor favor ajusta la edad mínima o máxima para evitar que coincidan o se traslapen las edades.`);
      return;
    }

    const dto: ModalityRequestDto = {
      category: formValue.category,
      division: formValue.division,
      style: formValue.style,
      minAge: minAge,
      maxAge: maxAge,
      eventId: currentEventId
    };

    const currentEditId = this.editingId();

    if (currentEditId !== null) {
      this.modalityService.updateModality(currentEditId, dto).subscribe({
        next: (updated) => {
          this.modalities.update(list => 
            list.map(m => m.id === currentEditId ? (updated || { ...m, ...dto }) : m)
          );
          this.resetForm();
        },
        error: (err) => alert(err?.error?.message || err?.message || 'Error al actualizar modalidad')
      });
    } else {
      this.modalityService.createModality(currentEventId, dto).subscribe({
        next: (created) => {
          if (created) {
            this.modalities.update(list => [...list, created]);
          } else {
            this.loadModalities(currentEventId);
          }
          this.resetForm();
        },
        error: (err) => alert(err?.error?.message || err?.message || 'Error al crear modalidad')
      });
    }
  }

  onEdit(modality: ModalityResponseDto): void {
    if (!this.isOwner()) return;
    this.editingId.set(modality.id);
    this.modalityForm.patchValue({
      category: modality.category,
      division: modality.division,
      style: modality.style,
      minAge: modality.minAge,
      maxAge: modality.maxAge
    });
  }

  onDelete(id: number): void {
    if (!this.isOwner()) return;
    if (confirm('¿Deseas eliminar esta modalidad?')) {
      this.modalityService.deleteModality(id).subscribe({
        next: () => {
          this.modalities.update(list => list.filter(m => m.id !== id));
          if (this.editingId() === id) {
            this.resetForm();
          }
        },
        error: (err) => alert(err?.error?.message || err?.message || 'Error al eliminar modalidad')
      });
    }
  }

  resetForm(): void {
    this.editingId.set(null);
    this.modalityForm.reset({
      category: ModalityCategory.URBAN,
      division: ModalityDivision.SOLO,
      style: '',
      minAge: null,
      maxAge: null
    });
  }
}