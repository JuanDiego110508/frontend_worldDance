import { Component, signal, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

interface LoginAttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCKOUT_MS = 60_000;
const ATTEMPTS_STORAGE_KEY = 'wd_login_attempts';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /* El backend (LoginRequestDto) exige contraseña de al menos 8 caracteres. */
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  /** Segundos restantes de bloqueo por intentos fallidos repetidos con el mismo correo (0 = sin bloqueo). */
  lockoutSecondsRemaining = signal(0);

  ngOnInit(): void {
    this.refreshLockoutState();

    this.loginForm.get('email')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshLockoutState());

    /* Recalcula el conteo cada segundo mientras el bloqueo esté activo, para que el
       aviso desaparezca solo cuando expire, sin necesidad de recargar la página. */
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshLockoutState());
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.refreshLockoutState();
    if (this.lockoutSecondsRemaining() > 0) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.clearFailedAttempts(email);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.registerFailedAttempt(email);
        this.errorMessage.set(
          this.lockoutSecondsRemaining() > 0
            ? 'Demasiados intentos fallidos con este correo. Espera antes de volver a intentarlo.'
            : (error?.message ?? 'Error al iniciar sesión')
        );
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /** Relee el estado de bloqueo del correo actual del formulario y actualiza el contador. */
  private refreshLockoutState(): void {
    const email = this.normalizeEmail(this.loginForm.getRawValue().email);
    if (!email) {
      this.lockoutSecondsRemaining.set(0);
      return;
    }

    const attempts = this.readAttempts();
    const record = attempts[email];
    if (!record?.lockedUntil) {
      this.lockoutSecondsRemaining.set(0);
      return;
    }

    const remainingMs = record.lockedUntil - Date.now();
    if (remainingMs <= 0) {
      /* El bloqueo expiró: se reinicia el conteo para darle 3 intentos frescos. */
      delete attempts[email];
      this.writeAttempts(attempts);
      this.lockoutSecondsRemaining.set(0);
      return;
    }

    this.lockoutSecondsRemaining.set(Math.ceil(remainingMs / 1000));
  }

  private registerFailedAttempt(email: string): void {
    const key = this.normalizeEmail(email);
    if (!key) return;

    const attempts = this.readAttempts();
    const current = attempts[key] ?? { count: 0, lockedUntil: null };
    const count = current.count + 1;
    attempts[key] = {
      count,
      lockedUntil: count >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCKOUT_MS : null
    };
    this.writeAttempts(attempts);
    this.refreshLockoutState();
  }

  private clearFailedAttempts(email: string): void {
    const key = this.normalizeEmail(email);
    const attempts = this.readAttempts();
    if (attempts[key]) {
      delete attempts[key];
      this.writeAttempts(attempts);
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private readAttempts(): Record<string, LoginAttemptRecord> {
    if (typeof localStorage === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(ATTEMPTS_STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private writeAttempts(data: Record<string, LoginAttemptRecord>): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(data));
  }
}
