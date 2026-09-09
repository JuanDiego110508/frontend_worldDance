import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveOverlayData } from '../../models/stream.model';

/** Gráfico del marcador superpuesto sobre el video, visible solo para el espectador. */
@Component({
  selector: 'app-overlay-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overlay-display.html',
  styleUrls: ['./overlay-display.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverlayDisplayComponent {
  readonly overlay = input<LiveOverlayData | null>(null);
}
