import { Component, DestroyRef, ChangeDetectionStrategy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';

import { StreamService } from '../../services/stream.service';
import { StreamIngestService } from '../../services/stream-ingest.service';
import { CameraPreviewComponent } from '../../components/camera-preview/camera-preview';
import { ControlPanelComponent } from '../../components/control-panel/control-panel';
import { OverlayEditorComponent } from '../../components/overlay-editor/overlay-editor';
import { StreamAdminResponse, StreamStatus, UpdateOverlayRequest } from '../../models/stream.model';
import { EventService } from '../../../events/services/event';
import { EventResponseDto } from '../../../events/models/event.model';

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
  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly cameraPreview = viewChild(CameraPreviewComponent);

  eventId = 0;

  event = signal<EventResponseDto | null>(null);
  session = signal<StreamAdminResponse | null>(null);
  status = signal<StreamStatus | null>(null);
  isLoading = signal(true);
  isBusy = signal(false);
  isSavingOverlay = signal(false);
  errorMessage = signal('');
  setupMode = signal(false);
  isEditingConfig = signal(false);
  isSavingConfig = signal(false);
  /** Aviso transitorio del regreso del callback OAuth de Kick (?kick=success|error en la URL). */
  kickCallbackNotice = signal<'success' | 'error' | null>(null);

  /** Nombre real del evento cuando ya se cargó; cae al ID solo mientras tanto (nunca lo oculta del todo). */
  readonly headerTitle = computed(() => this.event()?.name ?? `Evento #${this.eventId}`);

  /** Muestra solo los últimos 4 caracteres de la stream key en el resumen de configuración. */
  readonly maskedStreamKey = computed(() => {
    const key = this.session()?.streamKey ?? '';
    if (key.length <= 4) return key ? '••••' : '—';
    return `${'•'.repeat(key.length - 4)}${key.slice(-4)}`;
  });

  readonly ingestState = this.streamIngest.state;
  readonly ingestError = this.streamIngest.errorMessage;
  readonly ingestConnectionState = this.streamIngest.connectionState;
  /** true solo cuando el WebSocket de ingesta está abierto y MediaRecorder está enviando chunks. */
  readonly ingestFlowing = this.streamIngest.isFlowing;

  readonly setupForm = this.fb.nonNullable.group({
    provider: ['KICK', Validators.required],
    channelUrl: ['', Validators.required],
    rtmpUrl: ['', Validators.required],
    streamKey: ['', Validators.required],
    scheduleFor: ['', Validators.required]
  });

  /** Edición de la configuración de una sesión ya creada (servidor RTMP, stream key, canal, título). */
  readonly configForm = this.fb.nonNullable.group({
    channelUrl: ['', Validators.required],
    rtmpUrl: ['', Validators.required],
    streamKey: ['', Validators.required],
    title: [''],
    description: ['']
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
    this.loadEventInfo();
    this.loadAdminEvent();
    this.startStatusPolling();
    this.readKickCallbackNotice();

    window.addEventListener('focus', this.refreshOnFocus);
    this.destroyRef.onDestroy(() => window.removeEventListener('focus', this.refreshOnFocus));
  }

  private loadEventInfo(): void {
    this.eventService.getEventById(this.eventId).subscribe({
      next: (event) => this.event.set(event),
      // Si falla, el header cae al fallback "Evento #{id}" vía headerTitle(); no es un error bloqueante.
      error: () => this.event.set(null)
    });
  }

  /**
   * El callback OAuth de Kick (backend) redirige de vuelta aquí con `?kick=success|error` en vez de
   * devolver un JSON crudo. Se lee una sola vez y se limpia de la URL para que un refresh no
   * repita el aviso ni reintente nada.
   */
  private readKickCallbackNotice(): void {
    const kick = this.route.snapshot.queryParamMap.get('kick');
    if (kick === 'success' || kick === 'error') {
      this.kickCallbackNotice.set(kick);
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

      if (kick === 'success') {
        // Refresca el estado de vinculación de Kick (kickTokenLinked/kickTokenExpiresAt) sin pasar
        // por isLoading: recargar toda la página destruiría <app-camera-preview> y cortaría de
        // raíz cualquier captura/ingesta que ya estuviera activa en esta misma pestaña.
        this.refreshAdminEventSilently();
      }
    }
  }

  dismissKickCallbackNotice(): void {
    this.kickCallbackNotice.set(null);
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

    // La URL RTMP se guarda tal cual la escribió el usuario, sin recortar barras: el saneo para
    // evitar barras dobles al construir el destino de FFmpeg ocurre en el backend, solo en el
    // momento de concatenar con la stream key (ver KickApiClientServiceImpl.buildDestinationUrl).
    this.streamService.createStreamSession({
      eventId: this.eventId,
      provider: value.provider,
      channelUrl: value.channelUrl,
      rtmpUrl: value.rtmpUrl.trim(),
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

  openConfigEditor(): void {
    const data = this.session();
    if (!data) return;

    this.configForm.setValue({
      channelUrl: data.channelUrl ?? '',
      rtmpUrl: data.rtmpUrl ?? '',
      streamKey: data.streamKey ?? '',
      title: data.title ?? '',
      description: data.description ?? ''
    });
    this.errorMessage.set('');
    this.isEditingConfig.set(true);
  }

  cancelConfigEdit(): void {
    this.isEditingConfig.set(false);
  }

  submitConfigEdit(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    const value = this.configForm.getRawValue();
    this.isSavingConfig.set(true);
    this.errorMessage.set('');

    // La URL RTMP se guarda tal cual la escribió el usuario, sin recortar barras: el saneo para
    // evitar barras dobles al construir el destino de FFmpeg ocurre en el backend, solo en el
    // momento de concatenar con la stream key (ver KickApiClientServiceImpl.buildDestinationUrl).
    this.streamService.updateStreamConfig(this.eventId, {
      channelUrl: value.channelUrl.trim(),
      rtmpUrl: value.rtmpUrl.trim(),
      streamKey: value.streamKey.trim(),
      title: value.title.trim() || undefined,
      description: value.description.trim() || undefined
    }).subscribe({
      next: (updated) => {
        this.session.set(updated);
        this.isEditingConfig.set(false);
        this.isSavingConfig.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'No fue posible actualizar la configuración de la transmisión.');
        this.isSavingConfig.set(false);
      }
    });
  }

  isConfigFieldInvalid(field: string): boolean {
    const control = this.configForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
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

    // Nunca se sustituye por un valor por defecto: si no hay una fuente activa real (cámara o
    // pantalla), el backend terminaría "encendiendo" con un patrón sintético (testsrc) en silencio
    // — Kick reportaría is_live=true sin que llegue ninguna señal real. Mejor negarse aquí mismo.
    const sourceType = this.cameraPreview()?.activeSource();
    if (!sourceType) {
      this.errorMessage.set('No se detectó una fuente de video activa (cámara o pantalla). Actívala antes de iniciar el directo.');
      return;
    }

    this.isBusy.set(true);
    this.errorMessage.set('');

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
        // stopCapture() ya libera el hardware y detiene la ingesta (StreamIngestService.stop())
        // internamente; no hace falta llamarlo por separado aquí.
        await this.cameraPreview()?.stopCapture();
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
