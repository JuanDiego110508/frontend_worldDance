import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScheduleGenerationResponseDto, ScheduleSlotDto } from '../../models/scheduling.interface';

interface ModalityGroup {
  name: string;
  slots: ScheduleSlotDto[];
}

@Component({
  selector: 'app-schedule-timeline',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule-timeline.html',
  styleUrls: ['./schedule-timeline.scss']
})
export class ScheduleTimelineComponent implements OnInit, OnDestroy {
  private _schedule = signal<ScheduleGenerationResponseDto | null>(null);

  @Input({ required: true }) set schedule(val: ScheduleGenerationResponseDto) {
    this._schedule.set(val);
  }

  @Input() isAdmin: boolean = false;

  get schedule(): ScheduleGenerationResponseDto {
    return this._schedule()!;
  }

  currentTime = signal<Date>(new Date());
  private timerId: any;

  ngOnInit() {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 60000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  groupedSchedules = computed<ModalityGroup[]>(() => {
    const sched = this._schedule();
    if (!sched || !sched.schedules) return [];
    
    const map = new Map<string, ScheduleSlotDto[]>();
    for (const slot of sched.schedules) {
      const key = `${slot.division} · ${slot.category} · ${slot.style}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(slot);
    }
    
    const result: ModalityGroup[] = [];
    map.forEach((slots, name) => {
      result.push({ name, slots });
    });
    return result;
  });

  isSlotActive(slot: ScheduleSlotDto): boolean {
    const now = this.currentTime().getTime();
    const start = new Date(slot.startTime).getTime();
    const end = new Date(slot.endTime).getTime();
    return now >= start && now <= end;
  }

  isSlotPast(slot: ScheduleSlotDto): boolean {
    const now = this.currentTime().getTime();
    const end = new Date(slot.endTime).getTime();
    return now > end;
  }
}
