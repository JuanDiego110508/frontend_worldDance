import { Component, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { EventService } from '../../features/events/services/event';
import { EventResponseDto } from '../../features/events/models/event.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private eventService = inject(EventService);
  private router = inject(Router);
  
  user = this.authService.getCurrentUser();
  events = signal<EventResponseDto[]>([]);
  isLoadingEvents = signal(true);

  ngOnInit(): void {
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.isLoadingEvents.set(false);
      },
      error: () => {
        this.isLoadingEvents.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}