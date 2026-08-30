import { Component, signal, HostListener, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { Subscription } from 'rxjs';

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
  private authSubscription?: Subscription;

  
  darkMode = input<boolean>(false);
  
  isMenuOpen = signal<boolean>(false);
  isScrolled = signal<boolean>(false);
  isAuthenticated = signal<boolean>(false);
  userName = signal<string>('Usuario');


  navItems: NavItem[] = [
    { label: 'Inicio', route: '/' },
    { label: 'Eventos', route: '/events' },
    { label: 'Rankings', route: '/rankings' },
  ];

  ngOnInit(): void {
    this.updateAuthState();
    this.authSubscription = this.authService.authStatus$.subscribe(() => {
      this.updateAuthState();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  updateAuthState(): void {
    this.isAuthenticated.set(this.authService.isAuthenticated());
      if(this.isAuthenticated()) {
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

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
    this.closeMenu();
  }

  logout(): void {
    this.authService.logout();
    this.updateAuthState();
    this.router.navigate(['/']);
    this.closeMenu();
  }
}