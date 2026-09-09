import {
  Component,
  ElementRef,
  DestroyRef,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  inject,
  output,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type CaptureSource = 'camera' | 'screen';

/** Captura local de cámara/pantalla y previsualización; no conoce nada de la ingesta ni del backend. */
@Component({
  selector: 'app-camera-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-preview.html',
  styleUrls: ['./camera-preview.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CameraPreviewComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('previewVideo');

  private mediaStream: MediaStream | null = null;

  /**
   * Evita el error NG0953 (emitir un `output()` tras destruir el componente): al destruirse solo
   * se liberan los tracks de hardware, nunca se emite `streamChanged` porque ya no hay padre que
   * lo escuche de forma segura.
   */
  private destroyed = false;

  readonly isCapturing = signal(false);
  readonly activeSource = signal<CaptureSource | null>(null);
  readonly errorMessage = signal('');

  /** Emite el MediaStream activo (o null cuando se detiene) para que el contenedor lo publique vía la ingesta WebSocket. */
  readonly streamChanged = output<MediaStream | null>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.releaseTracks();
    });
  }

  async startCamera(): Promise<void> {
    await this.startCapture('camera', () =>
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    );
  }

  async startScreenShare(): Promise<void> {
    await this.startCapture('screen', () =>
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    );
  }

  stopCapture(): void {
    this.releaseTracks();
    this.isCapturing.set(false);
    this.activeSource.set(null);
    if (!this.destroyed) {
      this.streamChanged.emit(null);
    }
  }

  private releaseTracks(): void {
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
  }

  private async startCapture(source: CaptureSource, getStream: () => Promise<MediaStream>): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.errorMessage.set('');
    this.stopCapture();

    try {
      const stream = await getStream();

      // El diálogo de permisos/selector de pantalla es asíncrono; si el componente ya fue
      // destruido mientras se esperaba (ej. navegación fuera de la pantalla) no debe tocarse
      // ningún signal ni emitirse el output, solo liberar el stream recién obtenido.
      if (this.destroyed) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      this.mediaStream = stream;
      this.isCapturing.set(true);
      this.activeSource.set(source);

      const videoEl = this.videoRef()?.nativeElement;
      if (videoEl) {
        videoEl.srcObject = stream;
      }

      // `ended` solo se dispara cuando el usuario presiona "Dejar de compartir" en la barra del
      // navegador o desconecta físicamente el dispositivo; cambiar de pestaña o perder el foco de
      // la ventana NO dispara este evento, así que no corta la sesión en esos casos.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stopCapture());

      this.streamChanged.emit(stream);
    } catch (error) {
      if (this.destroyed) return;
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No fue posible acceder a la cámara o pantalla.'
      );
    }
  }
}
