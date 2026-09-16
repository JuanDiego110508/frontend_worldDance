import { Component, OnDestroy, computed, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MusicTrackService } from '../../services/music-track.service';
import { ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_FILE_SIZE_BYTES, MusicTrackResponseDto } from '../../models/music-track.model';

@Component({
  selector: 'app-music-upload-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './music-upload-form.html',
  styleUrls: ['./music-upload-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusicUploadFormComponent implements OnDestroy {
  private readonly musicTrackService = inject(MusicTrackService);

  readonly enrollmentId = input.required<number>();
  readonly hasExistingTrack = input(false);
  readonly uploaded = output<MusicTrackResponseDto>();

  readonly allowedExtensionsLabel = ALLOWED_AUDIO_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ');
  readonly maxSizeMbLabel = Math.round(MAX_AUDIO_FILE_SIZE_BYTES / (1024 * 1024));

  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  isUploading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  private successTimeout?: ReturnType<typeof setTimeout>;

  readonly submitLabel = computed(() => {
    if (this.isUploading()) return 'Guardando pista...';
    return this.hasExistingTrack() ? 'Reemplazar pista' : 'Subir pista';
  });

  readonly chosenFileLabel = computed(() => {
    const file = this.selectedFile();
    if (!file) return 'Ningún archivo seleccionado • Selecciona un archivo de audio...';
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} (${sizeMb} MB) — Listo para subir`;
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.validateAndSetFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.validateAndSetFile(file);
  }

  private validateAndSetFile(file: File | null): void {
    this.errorMessage.set('');
    this.selectedFile.set(null);

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isValidExtension = ALLOWED_AUDIO_EXTENSIONS.includes(extension);
    const isValidMimeType = file.type.startsWith('audio/') || file.type === 'video/mpeg';

    if (!isValidExtension && !isValidMimeType) {
      this.errorMessage.set(`El archivo debe ser un formato de audio válido (${this.allowedExtensionsLabel}).`);
      return;
    }

    if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      this.errorMessage.set(`El archivo supera el tamaño máximo permitido de ${this.maxSizeMbLabel}MB.`);
      return;
    }

    this.selectedFile.set(file);
  }

  submit(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;

    this.isUploading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    /* HttpClient corre sobre el backend Fetch (provideHttpClient(withFetch())), que no reporta
       progreso de subida (solo de descarga) — es una limitación del propio Fetch API, no de este
       código. Por eso el estado "subiendo" es indeterminado en vez de un porcentaje. */
    this.musicTrackService.uploadTrack(this.enrollmentId(), file).subscribe({
      next: (track) => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.successMessage.set(this.hasExistingTrack() ? '¡Pista reemplazada correctamente!' : '¡Pista subida correctamente!');
        this.uploaded.emit(track);

        clearTimeout(this.successTimeout);
        this.successTimeout = setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (error) => {
        this.isUploading.set(false);
        this.errorMessage.set(error?.message ?? 'Error al subir la pista musical.');
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.successTimeout);
  }
}
