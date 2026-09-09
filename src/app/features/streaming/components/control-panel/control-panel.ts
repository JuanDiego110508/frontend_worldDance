import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusStream, StreamStatus } from '../../models/stream.model';

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
  /** true solo cuando WebRTC confirmó que el medio local ya está fluyendo hacia SRS. */
  readonly mediaReady = input(false);

  readonly linkKick = output<void>();
  readonly goLive = output<void>();
  readonly stopLive = output<void>();
  readonly finish = output<void>();

  readonly StatusStream = StatusStream;
}
