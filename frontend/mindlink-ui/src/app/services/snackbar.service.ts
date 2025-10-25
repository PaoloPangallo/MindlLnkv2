import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  /** Mostra un messaggio di successo */
  success(message: string, duration = 3000): void {
    this.open(message, ['snackbar--success'], duration);
  }

  /** Mostra un messaggio di errore */
  error(message: string, duration = 4000): void {
    this.open(message, ['snackbar--error'], duration);
  }

  /** Mostra un messaggio informativo */
  info(message: string, duration = 3000): void {
    this.open(message, ['snackbar--info'], duration);
  }

  /** Mostra un messaggio di avviso */
  warning(message: string, duration = 3500): void {
    this.open(message, ['snackbar--warning'], duration);
  }

  /** Metodo interno centralizzato */
  private open(message: string, panelClasses: string[], duration: number): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: panelClasses,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    };
    this.snackBar.open(message, '✕', config);
  }
}
