import { Component, signal, computed, HostListener, input, inject, DestroyRef, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, catchError, interval, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../features/auth/services/auth.service';
import { StreamService } from '../../../features/streaming/services/stream.service';
import { LiveStreamSummary } from '../../../features/streaming/models/stream.model';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

/** Cada cuánto se revisa si hay eventos en vivo, para refrescar el indicador de la navbar. */
const LIVE_POLL_INTERVAL_MS = 30000;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly streamService = inject(StreamService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private authSubscription?: Subscription;

  darkMode = input<boolean>(false);

  isMenuOpen = signal<boolean>(false);
  isScrolled = signal<boolean>(false);
  isAuthenticated = signal<boolean>(false);
  userName = signal<string>('Usuario');

  /** Eventos con statusStream=LIVE en este momento (ver StreamService.getLiveStreams()). */
  liveStreams = signal<LiveStreamSummary[]>([]);
  isLiveMenuOpen = signal<boolean>(false);
  readonly hasLiveStreams = computed(() => this.liveStreams().length > 0);

  navItems: NavItem[] = [
    { label: 'Inicio', route: '/', icon: 'dashboard' },
    { label: 'Eventos', route: '/events', icon: 'celebration' },
    { label: 'Evaluar', route: '/scoring', icon: 'sports_score' },
    { label: 'Rankings', route: '/rankings', icon: 'leaderboard' },
  ];

  /** Enlaces visibles directamente en la barra; el resto se agrupa en el menú "Más" al pasar el mouse. */
  readonly primaryNavItems: NavItem[] = this.navItems.slice(0, 3);

  private liveMenuCloseTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.updateAuthState();
    this.authSubscription = this.authService.authStatus$.subscribe(() => {
      this.updateAuthState();
    });

    if (isPlatformBrowser(this.platformId)) {
      this.pollLiveStreams();
    }
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    clearTimeout(this.liveMenuCloseTimer);
  }

  updateAuthState(): void {
    this.isAuthenticated.set(this.authService.isAuthenticated());
    if (this.isAuthenticated()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        const firstName = currentUser.firstName || '';
        const lastName = currentUser.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        this.userName.set(fullName || currentUser.email || 'Usuario');
      }
    }
  }

  toggleMenu(): void {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
    this.isLiveMenuOpen.set(false);
  }

  private pollLiveStreams(): void {
    interval(LIVE_POLL_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() => this.streamService.getLiveStreams().pipe(catchError(() => of([] as LiveStreamSummary[])))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(streams => this.liveStreams.set(streams));
  }

  /**
   * Con un único evento en vivo, navega directo al espectador. Con varios, despliega el menú
   * para que el usuario elija; con cero, el menú muestra un estado vacío en vez de no hacer nada.
   */
  onLiveClick(): void {
    const streams = this.liveStreams();
    if (streams.length === 1) {
      this.goToLiveEvent(streams[0].eventId);
      return;
    }
    this.isLiveMenuOpen.update(open => !open);
  }

  goToLiveEvent(eventId: number): void {
    this.router.navigate(['/stream/watch', eventId]);
    this.isLiveMenuOpen.set(false);
    this.closeMenu();
  }

  closeLiveMenu(): void {
    this.isLiveMenuOpen.set(false);
  }

  /** Al pasar el mouse por encima (desktop), previsualiza el menú de "En Vivo" sin necesidad de clic. */
  onLiveMouseEnter(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    clearTimeout(this.liveMenuCloseTimer);
    this.isLiveMenuOpen.set(true);
  }

  /** Pequeño margen antes de cerrar para permitir mover el mouse del botón al menú desplegado. */
  onLiveMouseLeave(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.liveMenuCloseTimer = setTimeout(() => this.isLiveMenuOpen.set(false), 200);
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    this.isScrolled.set(scrollY > 20);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
    this.closeMenu();
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
    this.closeMenu();
  }

  goToProfile(): void {
    this.router.navigate(['/auth/profile']);
    this.closeMenu();
  }

  goToDashboard(): void {
    this.router.navigate(['/scoring']);
    this.closeMenu();
  }

  logout(): void {
    this.authService.logout();
    this.updateAuthState();
    this.router.navigate(['/']);
    this.closeMenu();
  }
}
