import { Component, DestroyRef, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';

import { StreamService } from '../../services/stream.service';
import { ViewerPlayerComponent } from '../../components/viewer-player/viewer-player';
import { StreamPublicResponse } from '../../models/stream.model';
import { EventService } from '../../../events/services/event';
import { EventResponseDto } from '../../../events/models/event.model';

@Component({
  selector: 'app-stream-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink, ViewerPlayerComponent],
  templateUrl: './stream-viewer.html',
  styleUrls: ['./stream-viewer.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StreamViewerComponent implements OnInit {
  private readonly streamService = inject(StreamService);
  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  eventId = 0;

  event = signal<EventResponseDto | null>(null);
  stream = signal<StreamPublicResponse | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('eventId');
    if (!idParam) {
      this.errorMessage.set('No se especificó un evento.');
      this.isLoading.set(false);
      return;
    }

    this.eventId = Number(idParam);
    this.loadEventInfo();
    this.startPolling();
  }

  private loadEventInfo(): void {
    this.eventService.getEventById(this.eventId).subscribe({
      next: (event) => this.event.set(event),
      error: () => this.event.set(null)
    });
  }

  private startPolling(): void {
    interval(6000).pipe(
      startWith(0),
      switchMap(() => this.streamService.getPublicEvent(this.eventId).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(stream => {
      this.isLoading.set(false);
      if (stream) {
        this.stream.set(stream);
        this.errorMessage.set('');
      } else if (!this.stream()) {
        this.errorMessage.set('No fue posible cargar la transmisión de este evento.');
      }
    });
  }
}
