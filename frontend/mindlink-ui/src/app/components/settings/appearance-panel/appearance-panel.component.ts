import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  standalone: true,
  selector: 'app-appearance-panel',
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatSlideToggleModule],
  templateUrl: './appearance-panel.component.html',
  styleUrls: ['./appearance-panel.component.scss']
})
export class AppearancePanelComponent implements OnInit {
  /** Form reattivo con tipizzazione forte e valori non nulli */
  form!: FormGroup<{
    theme: FormControl<'light' | 'dark'>;
    accent_color: FormControl<string>;
  }>;

  /** Emette i cambi di tema in tempo reale al parent */
  @Output() themeChanged = new EventEmitter<'light' | 'dark'>();

  constructor(private fb: NonNullableFormBuilder) {}

  ngOnInit(): void {
    // ✅ Crea il form tipizzato e non-nullable
    this.form = this.fb.group({
      theme: this.fb.control<'light' | 'dark'>('dark'),
      accent_color: this.fb.control<string>('#60a5fa')
    });

    // ✅ Applica il tema in tempo reale (debounce per evitare flicker)
    this.form.valueChanges.pipe(debounceTime(150)).subscribe(value => {
      const { theme, accent_color } = this.form.getRawValue();
      this.applyTheme(theme, accent_color);

      this.themeChanged.emit(value.theme);
    });

    // ✅ Ripristina dal localStorage (se presente)
    const savedTheme = localStorage.getItem('user_theme') as 'light' | 'dark' | null;
    const savedColor = localStorage.getItem('accent_color');
    if (savedTheme) this.form.patchValue({ theme: savedTheme });
    if (savedColor) this.form.patchValue({ accent_color: savedColor });

    // ✅ Applica il tema iniziale
    const { theme, accent_color } = this.form.getRawValue();

    this.applyTheme(theme, accent_color);
  }

  // ======================================================
  // 🔹 Applicazione dinamica del tema
  // ======================================================
  applyTheme(theme: 'light' | 'dark', accent: string): void {
    document.body.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent-color', accent);

    // ✅ Salva localmente per persistenza
    localStorage.setItem('user_theme', theme);
    localStorage.setItem('accent_color', accent);
  }
}
