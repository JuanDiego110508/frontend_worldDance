import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  user = signal<User | null>(null);
  isEditMode = signal(false);

  readonly editForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(6), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = signal(true);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading.set(true);
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.user.set(currentUser);
      this.resetFormFromUser(currentUser);
    } else {
      this.router.navigate(['/auth/login']);
    }
    this.isLoading.set(false);
  }

  private resetFormFromUser(user: User): void {
    this.editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      documentNumber: user.documentNumber,
      email: user.email
    });
  }

  toggleEditMode(): void {
    this.isEditMode.update(value => !value);
    this.errorMessage.set('');
    this.successMessage.set('');
    const currentUser = this.user();
    if (!this.isEditMode() && currentUser) {
      this.resetFormFromUser(currentUser);
    }
  }

  saveProfile(): void {
    const currentUser = this.user();
    if (this.editForm.invalid || !currentUser) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.editForm.getRawValue();

    this.authService.updateUser({
      id: currentUser.id,
      active: currentUser.active,
      ...formValue
    }).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.successMessage.set('Perfil actualizado correctamente');
        this.user.set({ ...currentUser, ...updated });
        setTimeout(() => this.isEditMode.set(false), 2000);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(error?.message ?? 'Error al actualizar el perfil');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.editForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
