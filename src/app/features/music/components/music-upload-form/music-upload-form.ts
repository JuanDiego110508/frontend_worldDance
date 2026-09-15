import { Component, computed, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
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
export class MusicUploadFormComponent {
  private readonly musicTrackService = inject(MusicTrackService);

  readonly enrollmentId = input.required<number>();
  readonly hasExistingTrack = input(false);
  readonly uploaded = output<MusicTrackResponseDto>();

  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  uploadProgress = signal(0);
  errorMessage = signal('');

  readonly submitLabel = computed(() => {
    if (this.isUploading()) return `Subiendo... ${this.uploadProgress()}%`;
    return this.hasExistingTrack() ? 'Reemplazar pista' : 'Subir pista';
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.errorMessage.set('');
    this.selectedFile.set(null);

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isValidExtension = ALLOWED_AUDIO_EXTENSIONS.includes(extension);
    const isValidMimeType = file.type.startsWith('audio/') || file.type === 'video/mpeg';

    if (!isValidExtension && !isValidMimeType) {
      this.errorMessage.set('El archivo debe ser un formato de audio válido (MP3, WAV, M4A, AAC, OGG).');
      input.value = '';
      return;
    }

    if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      this.errorMessage.set('El archivo supera el tamaño máximo permitido de 50MB.');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  submit(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.errorMessage.set('');

    this.musicTrackService.uploadTrackWithProgress(this.enrollmentId(), file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response && event.body) {
          this.isUploading.set(false);
          this.selectedFile.set(null);
          this.uploaded.emit(event.body.data);
        }
      },
      error: (error) => {
        this.isUploading.set(false);
        this.errorMessage.set(error?.message ?? 'Error al subir la pista musical.');
      }
    });
  }
}
