import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, interval, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { SnackType } from '../utils/snack-type.utils';
import { NavbarComponent } from '../components/navbar/navbar.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatSnackBarModule, NavbarComponent],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  // =====================================================
  // 🔹 Ciclo di vita
  // =====================================================
  ngOnInit(): void {
    this.syncCurrentUser();

    // 🔹 Se il token è scaduto tenta refresh silenzioso
    if (this.auth.isTokenExpired()) {
      this.trySilentRefresh();
    }

    // 🔹 Controllo periodico ogni minuto
    interval(60000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.checkTokenStatus();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =====================================================
  // 🔹 Gestione sessione
  // =====================================================

  /** Aggiorna currentUser dal BehaviorSubject o localStorage */
  private syncCurrentUser(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser = user;
    });

    const localUser = this.auth.currentUser;
    if (!this.currentUser && localUser) {
      this.currentUser = localUser;
    }
  }

  /** Controlla token e agisce di conseguenza */
  private checkTokenStatus(): void {
    if (!this.isLoading && this.auth.isTokenExpired()) {
      this.trySilentRefresh();
    }
  }

  /** Prova refresh silenzioso prima di disconnettere */
  private trySilentRefresh(): void {
    this.isLoading = true;
    this.auth.refreshToken().subscribe((success) => {
      this.isLoading = false;
      if (success) {
        console.info('🔁 Token aggiornato automaticamente');
      } else {
        console.warn('⚠️ Token scaduto, utente disconnesso');
        this.handleSessionExpired();
      }
    });
  }

  /** Mostra messaggio e forza logout */
  private handleSessionExpired(): void {
    this.showSnackBar(
      '⏰ Sessione scaduta, effettua di nuovo il login.',
      SnackType.Warning,
      4000
    );
    this.logout();
  }

  logout(): void {
    this.auth.logout();
    this.currentUser = null;
    this.showSnackBar(
      '👋 Disconnessione avvenuta con successo!',
      SnackType.Success,
      2500
    );
    setTimeout(() => this.router.navigate(['/auth']), 500);
  }

  // =====================================================
  // 🔹 Snackbar helper
  // =====================================================

  private showSnackBar(
    message: string,
    type: SnackType,
    duration = 3000
  ): void {
    this.snack.open(message, 'Chiudi', {
      duration,
      panelClass: [type],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
