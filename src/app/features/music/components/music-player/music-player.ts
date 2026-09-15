import { Component, OnDestroy, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MusicTrackService } from '../../services/music-track.service';
import { MusicTrackResponseDto } from '../../models/music-track.model';

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './music-player.html',
  styleUrls: ['./music-player.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusicPlayerComponent implements OnDestroy {
  private readonly musicTrackService = inject(MusicTrackService);

  readonly enrollmentId = input.required<number>();
  readonly track = input<MusicTrackResponseDto | null>(null);

  audioUrl = signal<string | null>(null);
  isLoadingAudio = signal(false);
  errorMessage = signal('');

  private objectUrl: string | null = null;

  loadAudio(): void {
    if (this.audioUrl() || this.isLoadingAudio()) return;

    this.isLoadingAudio.set(true);
    this.errorMessage.set('');

    this.musicTrackService.downloadTrack(this.enrollmentId()).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.audioUrl.set(this.objectUrl);
        this.isLoadingAudio.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message ?? 'No fue posible cargar la pista musical.');
        this.isLoadingAudio.set(false);
      }
    });
  }

  formatDuration(seconds: number | undefined | null): string {
    if (!seconds || seconds <= 0) return '0:00';
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatSize(sizeKb: number | undefined | null): string {
    if (!sizeKb) return '0 KB';
    return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }
}
