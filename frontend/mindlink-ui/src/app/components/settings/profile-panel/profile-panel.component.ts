import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {CommonModule, NgOptimizedImage} from "@angular/common";
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";
import { TextFieldModule } from '@angular/cdk/text-field';
import { SettingsService } from '../../../services/settings.service';

@Component({
  standalone: true,
  selector: 'app-profile-panel',
  templateUrl: './profile-panel.component.html',
  styleUrls: ['./profile-panel.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatIconModule,
    MatSelectModule,
    TextFieldModule,
    NgOptimizedImage
  ]
})
export class ProfilePanelComponent implements OnInit {

  loading = false;
  avatarUrl: string | null = null;
  avatarPreview: string | null = null;

  form!: FormGroup<{
    display_name: FormControl<string>;
    bio: FormControl<string>;
    language: FormControl<string>;
  }>;

  constructor(
    private fb: FormBuilder,
    private settings: SettingsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      display_name: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
      bio: this.fb.control('', { nonNullable: true }),
      language: this.fb.control('it', { nonNullable: true })
    });

    this.loadUserSettings();
  }

  isUploadingAvatar = false;

  loadUserSettings(): void {
    this.loading = true;
    this.settings.getUserSettings().subscribe({
      next: (data) => {
        const profile = data.preferences?.profile || {};
        this.form.patchValue({
          display_name: profile.display_name || '',
          bio: profile.bio || '',
          language: profile.language || 'it'
        });
        this.avatarUrl = profile.avatar_url || null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Errore nel caricamento del profilo', 'Chiudi', { duration: 3000 });
      }
    });
  }

  saveProfile(): void {
    if (this.form.invalid) return;
    this.loading = true;

    this.settings.updateUserSettings({
      preferences: { profile: this.form.value }
    }).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Profilo aggiornato con successo', 'OK', { duration: 2000 });
        this.form.markAsPristine();
      },
      error: () => {
        this.loading = false;
        this.snack.open('Errore durante il salvataggio', 'Chiudi', { duration: 3000 });
      }
    });
  }

  resetForm(): void {
    this.loadUserSettings();
  }

  get f() {
    return this.form.controls;
  }

 onAvatarSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  this.avatarPreview = URL.createObjectURL(file);

  this.isUploadingAvatar = true;
  this.settings.uploadAvatar(file).subscribe({
    next: (res) => {
      this.isUploadingAvatar = false;
      this.avatarUrl = res.avatar_url;
      this.snack.open('Avatar aggiornato con successo!', 'OK', { duration: 2000 });
    },
    error: () => {
      this.isUploadingAvatar = false;
      this.snack.open('Errore durante il caricamento dell’avatar', 'Chiudi', { duration: 3000 });
    }
  });
}

}
