import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string) {
    this.snackBar.open(`✅ ${message}`, 'Chiudi', {
      duration: 3000,
      panelClass: ['mindlink-snackbar-success']
    });
  }

  error(message: string) {
    this.snackBar.open(`❌ ${message}`, 'Chiudi', {
      duration: 4000,
      panelClass: ['mindlink-snackbar-error']
    });
  }
}
