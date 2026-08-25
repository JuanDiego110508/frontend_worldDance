import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  /* Obtenemos el usuario actual para mostrarlo en la vista */
  user = this.authService.getCurrentUser();

  /* Función para cerrar sesión y redirigir al login */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}