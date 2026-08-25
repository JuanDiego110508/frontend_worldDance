import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  /* Datos del formulario de registro según la base de datos */
  firstName = '';
  lastName = '';
  documentNumber = '';
  email = '';
  password = '';
  confirmPassword = '';
  
  /* Estados de la interfaz */
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  onSubmit(): void {
    /* Validaciones de campos obligatorios */
    if (!this.firstName || !this.lastName || !this.documentNumber || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Por favor completa todos los campos');
      return;
    }

    /* Validación de contraseñas */
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    /* Validar formato de email */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
      this.errorMessage.set('Ingresa un correo electrónico válido');
      return;
  }

  /* Validar número de documento (solo números) */
  const documentRegex = /^[0-9]+$/;
    if (!documentRegex.test(this.documentNumber)) {
    this.errorMessage.set('El número de documento solo debe contener números');
    return;
  }

    this.isLoading.set(true);
    this.errorMessage.set('');

    /* Preparamos los datos exactamente como los espera el backend */
    const registerData = {
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      email: this.email,
      password: this.password
    };

    this.authService.register(registerData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/auth/login'], { 
          queryParams: { registered: 'true' } 
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Error al registrarse');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(value => !value);
  }
}