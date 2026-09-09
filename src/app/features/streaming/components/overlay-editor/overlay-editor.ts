import { Component, ChangeDetectionStrategy, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LiveOverlayData, UpdateOverlayRequest } from '../../models/stream.model';

/** Editor del marcador en vivo (slot activo, nombre del competidor, puntaje, visibilidad). */
@Component({
  selector: 'app-overlay-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './overlay-editor.html',
  styleUrls: ['./overlay-editor.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverlayEditorComponent {
  private readonly fb = inject(FormBuilder);

  readonly overlay = input<LiveOverlayData | null>(null);
  readonly isSaving = input(false);

  readonly save = output<UpdateOverlayRequest>();

  readonly overlayForm = this.fb.nonNullable.group({
    currentSlotId: ['', Validators.required],
    participantLabel: ['', Validators.required],
    realTimeScore: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  constructor() {
    effect(() => {
      const current = this.overlay();
      if (current) {
        this.overlayForm.reset({
          currentSlotId: current.currentSlotId,
          participantLabel: current.participantLabel,
          realTimeScore: current.realTimeScore,
          isActive: current.isActive
        });
      }
    });
  }

  onSubmit(): void {
    if (this.overlayForm.invalid) {
      this.overlayForm.markAllAsTouched();
      return;
    }
    this.save.emit(this.overlayForm.getRawValue());
  }

  isFieldInvalid(field: string): boolean {
    const control = this.overlayForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
