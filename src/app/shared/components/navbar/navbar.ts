import { Component, inject, OnInit, signal, HostListener, computed, DestroyRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../features/auth/services/auth.service';
import { StreamService } from '../../../features/streaming/services/stream.service';
import { LiveStreamSummary } from '../../../features/streaming/models/stream.model';

interface NavItem {
  label: string;
  route: string;
  icon?: string;
}

/** Cada cuánto se revisa si hay eventos en vivo, para refrescar el indicador de la navbar. */
const LIVE_POLL_INTERVAL_MS = 30000;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly streamService = inject(StreamService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  isScrolled = signal<boolean>(false);
  darkMode = signal<boolean>(true);
  
  isMenuOpen = signal<boolean>(false);
  isLiveMenuOpen = signal<boolean>(false);
  isProfileMenuOpen = signal<boolean>(false);

  primaryNavItems: NavItem[] = [
    { label: 'Inicio', route: '/', icon: 'dashboard' },
    { label: 'Eventos', route: '/events', icon: 'celebration' }
  ];

  navItems: NavItem[] = [
    { label: 'Evaluar', route: '/scoring', icon: 'sports_score' },
    { label: 'Cronogramas', route: '/schedule', icon: 'calendar_clock' },
    { label: 'Rankings', route: '/rankings', icon: 'leaderboard' },
    { label: 'Reportes', route: '/reports', icon: 'bar_chart' },
    { label: 'Mis Inscripciones', route: '/enrollment/my', icon: 'how_to_reg' },
    { label: 'Gestión Inscripciones', route: '/enrollment', icon: 'admin_panel_settings' }
  ];

  /** Eventos con statusStream=LIVE en este momento (ver StreamService.getLiveStreams()). */
  liveStreams = signal<LiveStreamSummary[]>([]);
  hasLiveStreams = computed(() => this.liveStreams().length > 0);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.isMenuOpen.set(false);
      this.isProfileMenuOpen.set(false);
      this.isLiveMenuOpen.set(false);
    });

    if (isPlatformBrowser(this.platformId)) {
      this.pollLiveStreams();
    }
  }

  /** Refresca liveStreams cada LIVE_POLL_INTERVAL_MS; solo debe correr en el navegador (SSR no tiene sentido para esto). */
  private pollLiveStreams(): void {
    interval(LIVE_POLL_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() => this.streamService.getLiveStreams().pipe(catchError(() => of([] as LiveStreamSummary[])))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(streams => this.liveStreams.set(streams));
  }

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
  }

  onLiveMouseEnter() {
    this.isLiveMenuOpen.set(true);
  }

  onLiveMouseLeave() {
    this.isLiveMenuOpen.set(false);
  }

  onLiveClick() {
    if (this.hasLiveStreams() && this.liveStreams().length === 1) {
      this.goToLiveEvent(this.liveStreams()[0].eventId);
    } else {
      this.isLiveMenuOpen.update(v => !v);
    }
  }

  closeLiveMenu() {
    this.isLiveMenuOpen.set(false);
  }

  goToLiveEvent(eventId: number) {
    this.closeLiveMenu();
    this.router.navigate(['/stream/watch', eventId]);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  userName(): string {
    const user = this.authService.getCurrentUser();
    if (user) {
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || user.email || 'Usuario';
    }
    return 'Usuario';
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }

  goToProfile() {
    this.router.navigate(['/auth/profile']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
