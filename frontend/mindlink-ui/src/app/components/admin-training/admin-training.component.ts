import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {TrainingService} from "../../services/training.services";

@Component({
  selector: 'app-admin-training',
  templateUrl: './admin-training.component.html',
  standalone: true,
  styleUrls: ['./admin-training.component.scss']
})
export class AdminTrainingComponent {
  log: string = '';

  constructor(private training: TrainingService, private snack: MatSnackBar) {}

  start() {
    this.log = '⏳ Avvio training...';
    this.training.startTraining().subscribe({
      next: res => {
        this.log = JSON.stringify(res, null, 2);
        this.snack.open('✅ Training completato!', '', { duration: 3000 });
      },
      error: err => {
        this.log = '❌ Errore: ' + JSON.stringify(err.error || err.message);
        this.snack.open('Errore durante il training', '', { duration: 3000 });
      }
    });
  }
}
