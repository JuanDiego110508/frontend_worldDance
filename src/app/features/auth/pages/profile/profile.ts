import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = signal<User | null>(null);
  isEditMode = signal<boolean>(false);

  editData = {
    firstName: '',
    lastName: '',
    documentNumber: '',
    email: ''
  };

  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading.set(true);
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.user.set(currentUser);
      this.editData = {
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        documentNumber: currentUser.documentNumber || '',
        email: currentUser.email || ''
      };
    } else {
      this.router.navigate(['/auth/login']);
    }
    this.isLoading.set(false);
  }

  toggleEditMode(): void {
    this.isEditMode.update(value => !value);
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!this.isEditMode()) {
      const currentUser = this.user();
      if (currentUser) {
        this.editData = {
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          documentNumber: currentUser.documentNumber || '',
          email: currentUser.email || ''
        };
      }
    }
  }

  saveProfile(): void {
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.updateProfile(this.editData).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        this.successMessage.set('Perfil actualizado correctamente');
        const updatedUser = response.user;
        if (updatedUser) {
          this.user.set(updatedUser);
        }
        setTimeout(() => {
          this.isEditMode.set(false);
        }, 2000);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(error.message || 'Error al actualizar el perfil');
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}