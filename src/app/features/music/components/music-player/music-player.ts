import { Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MusicTrackService } from '../../services/music-track.service';
import { MusicTrackResponseDto } from '../../models/music-track.model';

/** Alturas fijas (en %) para las barras del visualizador decorativo — no es un análisis de espectro real. */
const WAVEFORM_BAR_HEIGHTS = [
  25, 40, 65, 30, 85, 50, 75, 95, 60, 35, 80, 45, 70, 90, 55, 40, 65, 85, 100, 70,
  45, 60, 80, 35, 90, 75, 50, 65, 40, 85, 55, 70, 95, 60, 30, 80, 45, 65, 90, 50
];

const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1.0x (Normal)' },
  { value: 1.15, label: '1.15x (Ensayo)' },
  { value: 1.25, label: '1.25x' }
];

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

  @ViewChild('audioEl') private audioElRef?: ElementRef<HTMLAudioElement>;

  readonly barHeights = WAVEFORM_BAR_HEIGHTS;
  readonly speedOptions = SPEED_OPTIONS;

  audioUrl = signal<string | null>(null);
  isLoadingAudio = signal(false);
  errorMessage = signal('');

  isPlaying = signal(false);
  currentTime = signal(0);
  volume = signal(80);
  isMuted = signal(false);
  playbackRate = signal(1);
  isSpeedMenuOpen = signal(false);

  private previousVolume = 80;
  private objectUrl: string | null = null;

  constructor() {
    /* Si llega una pista nueva (p. ej. tras reemplazarla), el audio ya descargado queda obsoleto:
       hay que limpiarlo para que el próximo play vuelva a descargar el archivo actual en vez de
       seguir reproduciendo el blob viejo en memoria. */
    effect(() => {
      this.track();
      this.resetPlayback();
    });
  }

  private resetPlayback(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    const audio = this.audioElRef?.nativeElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.audioUrl.set(null);
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.errorMessage.set('');
  }

  get selectedSpeedLabel(): string {
    return this.speedOptions.find(s => s.value === this.playbackRate())?.label ?? `${this.playbackRate()}x`;
  }

  toggleSpeedMenu(): void {
    this.isSpeedMenuOpen.update(open => !open);
  }

  selectSpeed(value: number): void {
    this.isSpeedMenuOpen.set(false);
    this.playbackRate.set(value);
    const audio = this.audioElRef?.nativeElement;
    if (audio) audio.playbackRate = value;
  }

  readonly duration = computed(() => {
    const audio = this.audioElRef?.nativeElement;
    if (audio && !Number.isNaN(audio.duration) && Number.isFinite(audio.duration)) {
      return audio.duration;
    }
    return this.track()?.durationSeconds ?? 0;
  });

  readonly progressPercent = computed(() => {
    const total = this.duration();
    return total > 0 ? (this.currentTime() / total) * 100 : 0;
  });

  readonly activeBarIndex = computed(() => Math.floor((this.progressPercent() / 100) * this.barHeights.length));

  readonly statusLabel = computed(() => {
    if (this.isLoadingAudio()) return 'CARGANDO PISTA...';
    if (!this.audioUrl()) return 'LISTO PARA REPRODUCIR';
    if (this.isPlaying()) return 'EN REPRODUCCIÓN (AUDICIÓN ACTIVA)';
    if (this.currentTime() > 0) return 'AUDIO EN PAUSA';
    return 'LISTO PARA REPRODUCIR';
  });

  /** Descarga la pista (si aún no se ha cargado) y reproduce/pausa. Evita bajar el archivo completo hasta el primer play. */
  togglePlay(): void {
    if (!this.audioUrl()) {
      this.loadAndPlay();
      return;
    }
    const audio = this.audioElRef?.nativeElement;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  private loadAndPlay(): void {
    if (this.isLoadingAudio()) return;
    this.isLoadingAudio.set(true);
    this.errorMessage.set('');

    this.musicTrackService.downloadTrack(this.enrollmentId()).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.audioUrl.set(this.objectUrl);
        this.isLoadingAudio.set(false);
        queueMicrotask(() => {
          const audio = this.audioElRef?.nativeElement;
          if (audio) {
            audio.volume = this.volume() / 100;
            audio.playbackRate = this.playbackRate();
            audio.play();
          }
        });
      },
      error: (error) => {
        this.errorMessage.set(error?.message ?? 'No fue posible cargar la pista musical.');
        this.isLoadingAudio.set(false);
      }
    });
  }

  stopAudio(): void {
    const audio = this.audioElRef?.nativeElement;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  rewind5(): void {
    const audio = this.audioElRef?.nativeElement;
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 5);
  }

  forward5(): void {
    const audio = this.audioElRef?.nativeElement;
    if (audio) audio.currentTime = Math.min(this.duration(), audio.currentTime + 5);
  }

  seekByClick(event: MouseEvent): void {
    const audio = this.audioElRef?.nativeElement;
    if (!audio || !this.duration()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = pct * this.duration();
  }

  onVolumeChange(value: string): void {
    const volume = Number(value);
    this.volume.set(volume);
    this.isMuted.set(volume === 0);
    const audio = this.audioElRef?.nativeElement;
    if (audio) audio.volume = volume / 100;
  }

  toggleMute(): void {
    const audio = this.audioElRef?.nativeElement;
    if (this.isMuted()) {
      this.volume.set(this.previousVolume);
      this.isMuted.set(false);
      if (audio) audio.volume = this.previousVolume / 100;
    } else {
      this.previousVolume = this.volume();
      this.volume.set(0);
      this.isMuted.set(true);
      if (audio) audio.volume = 0;
    }
  }

  onTimeUpdate(): void {
    const audio = this.audioElRef?.nativeElement;
    if (audio) this.currentTime.set(audio.currentTime);
  }

  onPlay(): void {
    this.isPlaying.set(true);
  }

  onPause(): void {
    this.isPlaying.set(false);
  }

  onEnded(): void {
    this.isPlaying.set(false);
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
