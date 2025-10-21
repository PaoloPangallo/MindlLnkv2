import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface AuthMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit, OnDestroy {
  authForm!: FormGroup;
  mode: 'login' | 'register' = 'login';
  message: AuthMessage = { type: 'info', text: '' };
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  hideMessage = false;

  private destroy$ = new Subject<void>();
  private messageTimeout: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Form dinamico basato sulla modalità
    this.updateFormValidators();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }

  private initForm(): void {
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [''],
    });
  }

  private updateFormValidators(): void {
    const confirmPasswordCtrl = this.authForm.get('confirmPassword');

    if (this.mode === 'register') {
      confirmPasswordCtrl?.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
    } else {
      confirmPasswordCtrl?.clearValidators();
    }

    confirmPasswordCtrl?.updateValueAndValidity();
  }

  toggleMode(): void {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.authForm.reset();
    this.message = { type: 'info', text: '' };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.updateFormValidators();
  }

  submit(): void {
    if (!this.authForm.valid) {
      this.setMessage(
        'error',
        'Compila tutti i campi correttamente'
      );
      return;
    }

    const { username, password, confirmPassword } = this.authForm.value;

    // Validazione password match in register
    if (this.mode === 'register' && password !== confirmPassword) {
      this.setMessage('error', 'Le password non coincidono');
      return;
    }

    this.loading = true;
    this.hideMessage = true;

    const obs =
      this.mode === 'login'
        ? this.auth.login(username, password)
        : this.auth.register(username, password);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loading = false;

        if (this.mode === 'login') {
          this.setMessage('success', 'Accesso riuscito! Redirecting...');
          this.messageTimeout = setTimeout(
            () => this.router.navigate(['/graph']),
            1500
          );
        } else {
          this.setMessage(
            'success',
            'Registrazione completata! Accedi ora.'
          );
          this.messageTimeout = setTimeout(() => {
            this.mode = 'login';
            this.authForm.reset();
            this.message = { type: 'info', text: '' };
            this.updateFormValidators();
          }, 2500);
        }
      },
      error: (err) => {
        this.loading = false;
        this.hideMessage = false;

        if (err.status === 400) {
          this.setMessage('error', 'Username già esistente o dati invalidi');
        } else if (err.status === 401) {
          this.setMessage('error', 'Credenziali non valide');
        } else if (err.status === 0) {
          this.setMessage('error', 'Errore di connessione. Riprova più tardi');
        } else {
          this.setMessage('error', 'Errore durante l\'autenticazione');
        }
      },
    });
  }

  private setMessage(type: 'success' | 'error' | 'info', text: string): void {
    this.message = { type, text };
    this.hideMessage = false;

    if (type === 'error') {
      this.messageTimeout = setTimeout(() => {
        this.message = { type: 'info', text: '' };
      }, 4000);
    }
  }

  get usernameError(): string {
    const ctrl = this.authForm.get('username');
    if (ctrl?.hasError('required')) return 'Username è obbligatorio';
    if (ctrl?.hasError('minlength')) return 'Minimo 3 caratteri';
    return '';
  }

  get passwordError(): string {
    const ctrl = this.authForm.get('password');
    if (ctrl?.hasError('required')) return 'Password è obbligatoria';
    if (ctrl?.hasError('minlength')) return 'Minimo 6 caratteri';
    return '';
  }

  get confirmPasswordError(): string {
    const ctrl = this.authForm.get('confirmPassword');
    if (ctrl?.hasError('required')) return 'Conferma la password';
    if (ctrl?.hasError('minlength')) return 'Minimo 6 caratteri';
    return '';
  }
}
