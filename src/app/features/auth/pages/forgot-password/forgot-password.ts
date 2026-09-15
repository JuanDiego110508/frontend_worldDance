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

  // States
  step = signal<'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'SUCCESS'>('EMAIL');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
  savedEmail = '';
  savedCode = '';

  // Forms
  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(group: any) {
    const pass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  onSubmitEmail(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const email = this.forgotForm.getRawValue().email;

    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.savedEmail = email;
        this.step.set('CODE');
        this.successMessage.set(response.message || 'Código enviado a tu correo');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error?.message ?? 'Error al enviar el correo de recuperación');
      }
    });
  }

  onSubmitCode(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const code = this.codeForm.getRawValue().code;

    this.authService.verifyRecoveryCode(this.savedEmail, code).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.savedCode = code;
        this.step.set('NEW_PASSWORD');
        this.errorMessage.set('');
        this.successMessage.set('');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error?.message ?? 'Código inválido o expirado');
      }
    });
  }

  onSubmitNewPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const newPassword = this.resetForm.getRawValue().newPassword;

    this.authService.resetPassword({
      email: this.savedEmail,
      code: this.savedCode,
      newPassword
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.step.set('SUCCESS');
        this.successMessage.set(response.message || 'Contraseña actualizada correctamente');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error?.message ?? 'Error al actualizar la contraseña');
      }
    });
  }

  isFieldInvalid(form: 'forgotForm' | 'codeForm' | 'resetForm', field: string): boolean {
    const control = (this[form] as any).get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  goBackToEmail(): void {
    this.step.set('EMAIL');
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
