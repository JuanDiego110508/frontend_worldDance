import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  emailSent = signal(false);

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    /* ms-auth-identityservice no implementa recuperación de contraseña: flujo simulado. */
    this.authService.requestPasswordReset(this.forgotForm.getRawValue().email).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.emailSent.set(true);
        this.successMessage.set(response.message);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error?.message ?? 'Error al enviar el correo de recuperación');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.forgotForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
