import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from "@angular/common";
import {MatCardModule} from "@angular/material/card";
import {MatInputModule} from "@angular/material/input";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatInputModule, MatSlideToggleModule],
  selector: 'app-privacy-panel',
  templateUrl: './privacy-panel.component.html',
  styleUrls: ['./privacy-panel.component.scss']
})
export class PrivacyPanelComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      visibility: ['public'],   // public | link | private
      consent_ai: [false],
      data_retention: ['1y']    // periodo di conservazione dati
    });
  }
}
