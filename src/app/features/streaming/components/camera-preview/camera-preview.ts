import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CameraCaptureService } from '../../services/camera-capture.service';

/**
 * Presentación pura: solo pinta el `MediaStream` que expone `CameraCaptureService` (root) y delega
 * en él el arranque/parada de la captura. Deliberadamente NO posee el `MediaStream` ni lo detiene
 * en `DestroyRef.onDestroy` — si lo hiciera, navegar fuera de esta pantalla (destruyendo este
 * componente) cortaría de raíz una transmisión en vivo. El servicio, al ser root, sigue vivo y
 * sigue enviando frames aunque este componente se desmonte; al volver a montarse (misma sesión de
 * captura), el `effect()` de abajo vuelve a enganchar el <video> al stream que ya seguía activo.
 */
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
  private readonly capture = inject(CameraCaptureService);
  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('previewVideo');

  /** URL de ingesta WS del evento actual; puede llegar más tarde que el propio componente. */
  readonly ingestUrl = input<string | null>(null);

  readonly isCapturing = this.capture.isCapturing;
  readonly activeSource = this.capture.activeSource;
  readonly errorMessage = this.capture.errorMessage;

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const stream = this.capture.stream();
      const videoEl = this.videoRef()?.nativeElement;
      if (!videoEl) return;

      videoEl.srcObject = stream;
      if (!stream) return;

      // El atributo `autoplay` del template ya dispara play() por su cuenta, pero esa promesa
      // interna del navegador no queda expuesta a nuestro código: si el navegador la rechaza
      // (elemento desmontado antes de que carguen los metadatos, track que termina en ese
      // instante, etc.) queda como un rechazo de promesa no manejado en la consola. Se espera a
      // 'loadedmetadata' y se llama play() explícitamente, con su propio catch.
      videoEl.addEventListener('loadedmetadata', () => {
        videoEl.play().catch(err => {
          console.warn('[CameraPreview] No se pudo iniciar la reproducción de la vista previa:', err);
        });
      }, { once: true });
    });
  }

  startCamera(): Promise<void> {
    return this.capture.startCamera(this.ingestUrl());
  }

  startScreenShare(): Promise<void> {
    return this.capture.startScreenShare(this.ingestUrl());
  }

  stopCapture(): Promise<void> {
    return this.capture.stopCapture();
  }
}
