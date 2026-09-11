import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusStream, StreamStatus } from '../../models/stream.model';

export type KickTokenStatus = 'linked' | 'expired' | 'not-linked';

/** Panel de control puro: no llama al backend, solo muestra estado y emite intenciones. */
@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './control-panel.html',
  styleUrls: ['./control-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlPanelComponent {
  readonly statusStream = input<StatusStream>(StatusStream.DRAFT);
  readonly status = input<StreamStatus | null>(null);
  readonly isBusy = input(false);
  readonly kickLinked = input(false);
  /** Instant ISO-8601 de expiración del token de Kick; null/undefined si nunca se vinculó. */
  readonly kickTokenExpiresAt = input<string | null | undefined>(null);
  /** true solo cuando WebRTC confirmó que el medio local ya está fluyendo hacia SRS. */
  readonly mediaReady = input(false);

  readonly linkKick = output<void>();
  readonly goLive = output<void>();
  readonly stopLive = output<void>();
  readonly finish = output<void>();

  readonly StatusStream = StatusStream;

  /**
   * "expired" solo si HUBO un token (hay fecha de expiración registrada) pero ya no está vigente;
   * distinto de "not-linked" (nunca se vinculó), para no confundir "vence a las 2h" con "nunca".
   */
  readonly kickTokenStatus = computed<KickTokenStatus>(() => {
    if (this.kickLinked()) return 'linked';
    return this.kickTokenExpiresAt() ? 'expired' : 'not-linked';
  });
}
