import { Component, DestroyRef, ChangeDetectionStrategy, OnInit, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';

import { StreamService } from '../../services/stream.service';
import { StreamIngestService } from '../../services/stream-ingest.service';
import { CameraPreviewComponent } from '../../components/camera-preview/camera-preview';
import { ControlPanelComponent } from '../../components/control-panel/control-panel';
import { OverlayEditorComponent } from '../../components/overlay-editor/overlay-editor';
import { StreamAdminResponse, StreamStatus, UpdateOverlayRequest } from '../../models/stream.model';

@Component({
  selector: 'app-stream-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CameraPreviewComponent, ControlPanelComponent, OverlayEditorComponent],
  templateUrl: './stream-admin.html',
  styleUrls: ['./stream-admin.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StreamAdminComponent implements OnInit {
  private readonly streamService = inject(StreamService);
  private readonly streamIngest = inject(StreamIngestService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly cameraPreview = viewChild(CameraPreviewComponent);

  eventId = 0;

  session = signal<StreamAdminResponse | null>(null);
  status = signal<StreamStatus | null>(null);
  isLoading = signal(true);
  isBusy = signal(false);
  isSavingOverlay = signal(false);
  errorMessage = signal('');
  setupMode = signal(false);

  readonly ingestState = this.streamIngest.state;
  readonly ingestError = this.streamIngest.errorMessage;
  readonly ingestConnectionState = this.streamIngest.connectionState;
  /** true solo cuando el WebSocket de ingesta está abierto y MediaRecorder está enviando chunks. */
  readonly ingestFlowing = this.streamIngest.isFlowing;

  /**
   * El backend no expone si la cuenta de Kick ya quedó vinculada (el token OAuth vive
   * solo server-side); el botón "Vincular Kick" queda siempre disponible por ese motivo.
   */
  readonly setupForm = this.fb.nonNullable.group({
    provider: ['KICK', Validators.required],
    channelUrl: ['', Validators.required],
    rtmpUrl: ['', Validators.required],
    streamKey: ['', Validators.required],
    scheduleFor: ['', Validators.required]
  });

  private readonly refreshOnFocus = (): void => {
    if (this.session()) {
      this.refreshAdminEventSilently();
    }
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('eventId');
    if (!idParam) {
      this.errorMessage.set('No se especificó un evento.');
      this.isLoading.set(false);
      return;
    }

    this.eventId = Number(idParam);
    this.loadAdminEvent();
    this.startStatusPolling();

    window.addEventListener('focus', this.refreshOnFocus);
    this.destroyRef.onDestroy(() => window.removeEventListener('focus', this.refreshOnFocus));
  }

  loadAdminEvent(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.streamService.getAdminEvent(this.eventId).subscribe({
      next: (data) => {
        this.session.set(data);
        this.setupMode.set(false);
        this.isLoading.set(false);
      },
      error: () => {
        // Sin sesión creada todavía para este evento: se ofrece el formulario de configuración inicial.
        this.session.set(null);
        this.setupMode.set(true);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Refresco en segundo plano (ej. al recuperar el foco de la ventana, algo que también dispara el
   * selector nativo de "Compartir pantalla" al cerrarse). A diferencia de `loadAdminEvent()`, NO
   * toca `isLoading`: hacerlo tira abajo la rama `@else if (session(); as data)` del template y con
   * ella destruye <app-camera-preview>, cortando en seco la captura activa y el WebSocket de
   * ingesta en pleno directo. Aquí solo se actualiza `session()` in place.
   */
  private refreshAdminEventSilently(): void {
    this.streamService.getAdminEvent(this.eventId).subscribe({
      next: (data) => this.session.set(data),
      error: () => {
        // Fallo transitorio de red: se conserva la última sesión conocida en pantalla en vez de
        // abortar la ingesta/captura activa por esto.
      }
    });
  }

  private startStatusPolling(): void {
    interval(4000).pipe(
      startWith(0),
      switchMap(() => this.streamService.getStatus(this.eventId).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(status => {
      if (status) this.status.set(status);
    });
  }

  submitSetup(): void {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    const value = this.setupForm.getRawValue();
    this.isBusy.set(true);
    this.errorMessage.set('');

    // El backend concatena `rtmpUrl + "/" + streamKey` literalmente: una barra final aquí
    // produciría "rtmps://host/app//streamKey" (doble barra) en el destino real de Kick.
    const normalizedRtmpUrl = value.rtmpUrl.trim().replace(/\/+$/, '');

    this.streamService.createStreamSession({
      eventId: this.eventId,
      provider: value.provider,
      channelUrl: value.channelUrl,
      rtmpUrl: normalizedRtmpUrl,
      streamKey: value.streamKey.trim(),
      scheduleFor: new Date(value.scheduleFor).toISOString()
    }).subscribe({
      next: (created) => {
        this.session.set(created);
        this.setupMode.set(false);
        this.isBusy.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible crear la sesión de streaming.');
        this.isBusy.set(false);
      }
    });
  }

  async onLocalStreamChanged(stream: MediaStream | null): Promise<void> {
    const ingestUrl = this.session()?.ingestUrl;

    if (stream && ingestUrl) {
      try {
        await this.streamIngest.publish(ingestUrl, stream);
      } catch {
        // El detalle del error ya queda reflejado en streamIngest.errorMessage().
      }
    } else if (!stream) {
      await this.streamIngest.stop();
    }
  }

  linkKick(): void {
    this.streamService.getKickLoginUrl(this.eventId).subscribe({
      next: (url) => window.open(url, '_blank', 'noopener'),
      error: (err) => this.errorMessage.set(err?.message ?? 'No fue posible obtener el enlace de autorización de Kick.')
    });
  }

  goLive(): void {
    if (!this.streamIngest.isFlowing()) {
      this.errorMessage.set('Activa la cámara o pantalla y espera a que la ingesta confirme la conexión (estado "connected") antes de iniciar el directo.');
      return;
    }

    this.isBusy.set(true);
    this.errorMessage.set('');

    // ffmpeg-manager solo reconoce 'camera' | 'screen' (todo lo demás cae a 'testsrc', el patrón sintético).
    const sourceType = this.cameraPreview()?.activeSource() ?? 'camera';

    this.streamService.toggleState(this.eventId, { enable: true, sourceType }).subscribe({
      next: (updated) => {
        this.session.update(current => (current ? { ...current, statusStream: updated.statusStream } : current));
        this.isBusy.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible iniciar la transmisión.');
        this.isBusy.set(false);
      }
    });
  }

  stopLive(): void {
    this.isBusy.set(true);
    this.errorMessage.set('');

    const sourceType = this.cameraPreview()?.activeSource() ?? 'camera';

    this.streamService.toggleState(this.eventId, { enable: false, sourceType }).subscribe({
      next: (updated) => {
        this.session.update(current => (current ? { ...current, statusStream: updated.statusStream } : current));
        this.isBusy.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible detener la transmisión.');
        this.isBusy.set(false);
      }
    });
  }

  finishStreaming(): void {
    const streamId = this.session()?.id;
    if (!streamId) return;
    if (!confirm('¿Finalizar la transmisión? Esta acción cerrará la sesión y liberará los recursos.')) return;

    this.streamService.finishStream(streamId).subscribe({
      next: async (updated) => {
        await this.streamIngest.stop();
        this.cameraPreview()?.stopCapture();
        this.session.update(current => (current ? { ...current, statusStream: updated.statusStream } : current));
      },
      error: (err) => this.errorMessage.set(err?.message ?? 'No fue posible finalizar la transmisión.')
    });
  }

  saveOverlay(overlay: UpdateOverlayRequest): void {
    this.isSavingOverlay.set(true);
    this.errorMessage.set('');

    this.streamService.updateOverlay(this.eventId, overlay).subscribe({
      next: (updated) => {
        this.session.update(current => (current ? { ...current, liveOverlayData: updated.liveOverlayData } : current));
        this.isSavingOverlay.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible actualizar el overlay.');
        this.isSavingOverlay.set(false);
      }
    });
  }

  isSetupFieldInvalid(field: string): boolean {
    const control = this.setupForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
