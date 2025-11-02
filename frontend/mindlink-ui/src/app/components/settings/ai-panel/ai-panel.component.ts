import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  NonNullableFormBuilder
} from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

/** 🔹 Modello dati del pannello AI */
interface AiSettingsForm {
  similarity_threshold: number;
  enable_autotune: boolean;
}

@Component({
  standalone: true,
  selector: 'app-ai-panel',
  templateUrl: './ai-panel.component.html',
  styleUrls: ['./ai-panel.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSliderModule,
    MatSlideToggleModule
  ]
})
export class AiPanelComponent implements OnInit {
  /** Form tipizzato e non-nullable */
  form!: FormGroup<{
    similarity_threshold: FormControl<number>;
    enable_autotune: FormControl<boolean>;
  }>;

  /** Emette i cambiamenti al parent */
  @Output() settingsChanged = new EventEmitter<AiSettingsForm>();

  constructor(private fb: NonNullableFormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      similarity_threshold: this.fb.control(0.75),
      enable_autotune: this.fb.control(true)
    });

    // 🔹 Emette modifiche con debounce per evitare flood
    this.form.valueChanges.pipe(debounceTime(150)).subscribe(value => {
  this.settingsChanged.emit(value as AiSettingsForm);
  this.applyAiSettings(value);
});


    // 🔹 Carica eventuali impostazioni salvate
    const saved = localStorage.getItem('ai_settings');
    if (saved) {
      const parsed: AiSettingsForm = JSON.parse(saved);
      this.form.patchValue(parsed);
    }
  }

  // ======================================================
  // 🔹 Applicazione impostazioni AI dinamiche
  // ======================================================
 applyAiSettings(value: Partial<AiSettingsForm>): void {
  if (value.similarity_threshold !== undefined) {
    document.documentElement.style.setProperty(
      '--similarity-threshold',
      value.similarity_threshold.toString()
    );
  }

  localStorage.setItem('ai_settings', JSON.stringify(value));
}}

