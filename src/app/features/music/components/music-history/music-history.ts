import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MusicTrackHistoryEntry } from '../../models/music-track.model';

@Component({
  selector: 'app-music-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './music-history.html',
  styleUrls: ['./music-history.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusicHistoryComponent {
  readonly history = input<MusicTrackHistoryEntry[]>([]);

  /** Más reciente primero: el backend guarda el historial en orden cronológico de reemplazo. */
  readonly entries = computed(() => [...this.history()].reverse());
}
