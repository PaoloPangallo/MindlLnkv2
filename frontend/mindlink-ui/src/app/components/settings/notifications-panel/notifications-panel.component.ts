import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from "@angular/common";
import {MatCardModule} from "@angular/material/card";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatSlideToggleModule],
  selector: 'app-notifications-panel',
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.scss']
})
export class NotificationsPanelComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email_updates: [true],
      ai_suggestions: [true],
      graph_alerts: [false],
      weekly_summary: [true]
    });
  }
}
