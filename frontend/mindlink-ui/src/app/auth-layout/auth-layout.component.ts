import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface User {
  username: string;
  id?: number;
  email?: string;
}


export enum SnackType {
  Success = 'snackbar-success',
  Warning = 'snackbar-warning',
  Error = 'snackbar-error',
}

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatSnackBarModule],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = false;
  menuOpen = false;

  private tokenCheckInterval: any;
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.startTokenExpirationCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
  }

  private loadCurrentUser(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.currentUser = {
        username: user.username,
        id: user.id,
        email: user.email,
      };
    }
  }

private startTokenExpirationCheck(): void {
  this.tokenCheckInterval = setInterval(() => {
    if (!this.isLoading && this.auth.isTokenExpired()) {
      this.handleSessionExpired();
    }
  }, 60000);
}


private handleSessionExpired(showNotice = true): void {
  if (showNotice) {
    this.showSnackBar(
      '⏰ Sessione scaduta, effettua di nuovo il login.',
      SnackType.Warning,
      5000
    );
  }
  this.logout();
}

logout(): void {
  this.isLoading = true;

  // Logout immediato (sincrono)
  this.auth.logout();

  this.isLoading = false;
  this.currentUser = null;
  this.menuOpen = false;

  this.showSnackBar(
    '👋 Disconnessione avvenuta con successo!',
    SnackType.Success,
    2500
  );

  setTimeout(() => this.router.navigate(['/auth']), 500);
}



  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  navigateTo(route: string): void {
    this.closeMenu();
    this.router.navigate([route]);
  }

  private showSnackBar(message: string, type: SnackType = SnackType.Success, duration = 3000) {
  this.snack.open(message, 'Chiudi', {
    duration,
    panelClass: [type],
    horizontalPosition: 'end',
    verticalPosition: 'bottom',
  });
}


  get initials(): string {
    if (!this.currentUser?.username) return '';
    return this.currentUser.username
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }


}



