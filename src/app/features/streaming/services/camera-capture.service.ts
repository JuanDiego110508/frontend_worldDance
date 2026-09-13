import { Injectable, inject, signal } from '@angular/core';
import { StreamIngestService } from './stream-ingest.service';

const LOG_PREFIX = '[CameraCapture]';

/**
 * Propietario único del `MediaStream` de cámara/micrófono y del ciclo de vida
 * captura->ingesta. Se provee en 'root' a propósito: si esta responsabilidad viviera en
 * `CameraPreviewComponent` (como antes), navegar fuera de la página de administración del stream
 * destruye el componente y con él el `DestroyRef.onDestroy` detiene las pistas de hardware — cortando
 * en seco una transmisión en vivo por una simple navegación dentro de la SPA. Al vivir aquí, el
 * stream y el WebSocket de ingesta (también root, ver StreamIngestService) sobreviven a cualquier
 * componente que se monte/desmonte; solo `stopStream()` (acción explícita del usuario) los libera.
 *
 * Solo captura cámara vía `getUserMedia`: no existe soporte de "compartir pantalla"
 * (`getDisplayMedia`) en este flujo, por decisión explícita de producto.
 */
@Injectable({
  providedIn: 'root'
})
export class CameraCaptureService {
  private readonly ingest = inject(StreamIngestService);

  private mediaStream: MediaStream | null = null;

  /** Stream activo (o null). Los componentes de presentación se suscriben a esto para pintar el <video>. */
  readonly stream = signal<MediaStream | null>(null);
  readonly isCapturing = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    // No se puede usar @HostListener aquí: ese decorador solo aplica a componentes/directivas con
    // un elemento host, y un servicio no tiene uno. Un listener nativo en el constructor de un
    // servicio 'root' cumple el mismo propósito y no necesita limpieza: el servicio vive mientras
    // viva la pestaña. Se avisa de recarga/cierre SOLO si hay ingesta realmente fluyendo (socket
    // abierto + MediaRecorder enviando), no solo si la cámara está prendida sin transmitir todavía.
    window.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
      if (this.ingest.isFlowing()) {
        event.preventDefault();
        event.returnValue = 'Tienes una transmisión en vivo activa. ¿Seguro que deseas salir?';
      }
    });
  }

  async startCamera(ingestUrl: string | null | undefined): Promise<void> {
    this.errorMessage.set('');
    await this.stopStream();

    if (!window.isSecureContext) {
      this.errorMessage.set(
        'Tu navegador bloquea el acceso a la cámara y el micrófono en conexiones no seguras (HTTP). '
        + 'Accede mediante HTTPS o desde localhost para poder transmitir.'
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage.set('Este navegador no soporta el acceso a la cámara (MediaDevices API no disponible).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      this.mediaStream = stream;
      this.isCapturing.set(true);
      this.stream.set(stream);

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        console.warn(`${LOG_PREFIX} La pista de video terminó (cámara desconectada o permiso revocado).`);
        this.stopStream();
      });

      if (ingestUrl) {
        try {
          await this.ingest.publish(ingestUrl, stream);
        } catch {
          // El detalle del error ya queda reflejado en streamIngest.errorMessage(), que
          // stream-admin.ts ya muestra por separado.
        }
      } else {
        console.warn(`${LOG_PREFIX} No hay ingestUrl disponible todavía; solo se activó la vista previa local.`);
      }
    } catch (error) {
      this.errorMessage.set(this.describeCaptureError(error));
    }
  }

  /**
   * Único punto de entrada para apagar la cámara y la transmisión: detiene el `MediaRecorder` y
   * cierra el WebSocket (vía `StreamIngestService.stop()`), detiene las pistas de hardware y limpia
   * las señales de estado. Debe llamarse solo ante una acción explícita del usuario (botón "Apagar
   * Stream"/"Detener captura"/"Finalizar"), nunca desde el ciclo de vida de un componente — ese
   * acoplamiento es exactamente el bug que este servicio existe para eliminar.
   */
  async stopStream(): Promise<void> {
    await this.ingest.stop();
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.isCapturing.set(false);
    this.stream.set(null);
  }

  /**
   * Traduce las excepciones más comunes de getUserMedia a un mensaje accionable, en vez de mostrar
   * el `error.message` crudo del navegador (ej. "Permission denied" a secas).
   */
  private describeCaptureError(error: unknown): string {
    const label = 'la cámara y el micrófono';

    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return `Debes conceder permiso para acceder a ${label} en tu navegador para poder transmitir.`;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return `No se encontró ningún dispositivo de ${label} disponible en este equipo.`;
        case 'NotReadableError':
        case 'TrackStartError':
          return `No fue posible acceder a ${label}: puede estar en uso por otra aplicación.`;
        case 'AbortError':
          return 'Se canceló la selección antes de completarse.';
      }
    }

    return error instanceof Error ? error.message : `No fue posible acceder a ${label}.`;
  }
}
