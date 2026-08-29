import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /* Variables que guardan lo que el usuario escribe en el formulario */
  email = '';
  password = '';
  rememberMe = false;
  
  /* Estados para controlar la interfaz mientras se procesa la petición */
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  showPassword = signal<boolean>(false);

  /* Función que se ejecuta cuando el usuario hace clic en "Iniciar Sesión" */
  onSubmit(): void {
    /* Validamos que los campos no estén vacíos */
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    /* Llamamos al servicio de autenticación para iniciar sesión */
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Error al iniciar sesión');
      }
    });
  }

  /* Función para mostrar u ocultar la contraseña en el campo de texto */
  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }
}