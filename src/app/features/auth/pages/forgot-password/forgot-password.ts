import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);

  email = '';
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  emailSent = signal<boolean>(false);

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage.set('Por favor ingresa tu correo electrónico');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    /* Simulación del envío de correo */
    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.emailSent.set(true);
        this.successMessage.set('Hemos enviado un enlace de recuperación a tu correo');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Error al enviar el correo de recuperación');
      }
    });
  }
}