import { Component, signal, HostListener, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  darkMode = input<boolean>(false);
  
  isMenuOpen = signal<boolean>(false);
  isScrolled = signal<boolean>(false);

  navItems: NavItem[] = [
    { label: 'Inicio', route: '/' },
    { label: 'Eventos', route: '/events' },
    { label: 'Rankings', route: '/rankings' },
  ];

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userName(): string {
    const user = this.authService.getCurrentUser();
    if (user) {
      /* Usar solo los campos que existen en la interfaz User */
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || user.email || 'Usuario';
    }
    return 'Usuario';
  }

  toggleMenu(): void {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
    this.closeMenu();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
    this.closeMenu();
  }
}