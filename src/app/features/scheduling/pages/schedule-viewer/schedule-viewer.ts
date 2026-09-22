import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SchedulingService } from '../../services/scheduling.service';
import { ScheduleGenerationResponseDto } from '../../models/scheduling.interface';
import { finalize } from 'rxjs';
import { ScheduleTimelineComponent } from '../../components/schedule-timeline/schedule-timeline';

@Component({
  selector: 'app-schedule-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink, ScheduleTimelineComponent],
  templateUrl: './schedule-viewer.html',
  styleUrl: './schedule-viewer.scss'
})
export class ScheduleViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly schedulingService = inject(SchedulingService);

  eventId = signal<number | null>(null);
  schedule = signal<ScheduleGenerationResponseDto | null>(null);
  
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isNotPublished = signal<boolean>(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('eventId');
      if (id) {
        this.eventId.set(Number(id));
        this.loadSchedule();
      }
    });
  }

  loadSchedule() {
    const id = this.eventId();
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.isNotPublished.set(false);
    
    this.schedulingService.getScheduleByEvent(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (!res || !res.schedules || res.schedules.length === 0) {
            this.isNotPublished.set(true);
            this.schedule.set(null);
          } else {
            this.schedule.set(res);
            this.isNotPublished.set(false);
          }
        },
        error: (err) => {
          this.schedule.set(null);
          const msg = (err.error?.message || err.message || '').toLowerCase();
          if (err.status === 404 || err.status === 400 || msg.includes('publicado') || msg.includes('not found') || msg.includes('no existe')) {
            this.isNotPublished.set(true);
          } else {
            this.errorMessage.set('Error al cargar el cronograma: ' + (err.error?.message || err.message));
          }
        }
      });
  }

  formattedEventCode(): string {
    const id = this.eventId();
    if (!id) return 'WD-CHAMP-2026';
    const paddedId = String(id).padStart(2, '0');
    return `WD-CHAMP-2026-${paddedId}`;
  }
}

