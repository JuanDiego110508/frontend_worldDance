import { Component, inject, OnInit, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon?: string;
}

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

  liveStreams = signal<any[]>([]);
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
