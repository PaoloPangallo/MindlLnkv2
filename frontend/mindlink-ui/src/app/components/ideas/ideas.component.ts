import { Component, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { Idea } from '../../models/idea.model';
import {
  MatButtonModule
} from '@angular/material/button';
import {
  DatePipe,
  DecimalPipe,
  NgForOf,
  NgIf,
  NgSwitch,
  NgSwitchCase
} from '@angular/common';
import { IdeasService, InsightData } from '../../services/ideas.services';

@Component({
  selector: 'app-ideas',
  templateUrl: './ideas.component.html',
  styleUrls: ['./ideas.component.scss'],
  imports: [
    MatButtonModule,
    NgSwitch,
    NgIf,
    DecimalPipe,
    NgForOf,
    DatePipe,
    NgSwitchCase
  ],
  standalone: true
})
export class IdeasComponent implements OnInit {
  // ================================
  // 🔹 Proprietà principali
  // ================================
  ideas: Idea[] = [];
  relatedIdeas: any[] = [];
  insights: InsightData | null = null;

  activeTab: string = 'mine';
  selectedIdea: Idea | null = null;
  loading = false;

  /** 🔸 Messaggi di stato o errore da mostrare */
  error: string | null = null;
  infoMessage: string | null = null;

  // 🔧 Pesi per la similarità
  cosineWeight = 0.6;
  keywordWeight = 0.3;
  categoryWeight = 0.1;

  constructor(private ideasService: IdeasService,  private cdr: ChangeDetectorRef) {


  }

  private destroy$ = new Subject<void>();


  // ================================
  // 🔹 Lifecycle
  // ================================
  ngOnInit(): void {
    this.loadMyIdeas();
    this.loadInsights();
  }

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


  // ================================
  // 🔹 Carica idee personali
  // ================================
  loadMyIdeas(): void {
  console.log('⚙️ Caricamento idee personali...');
  this.loading = true;
  this.error = null;
  const timeout = setTimeout(() => {
    if (this.loading) {
      console.warn('⏳ Timeout caricamento idee personali.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }, 10000);

  this.ideasService.getMyIdeas()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        clearTimeout(timeout);
        this.ideas = data || [];
        this.loading = false;
        console.log(`✅ Ricevute ${this.ideas.length} idee`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(timeout);
        console.error('❌ Errore caricamento idee:', err);
        this.error = 'Errore durante il caricamento delle idee.';
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        clearTimeout(timeout);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
}


  // ================================
  // 🔹 Seleziona idea e mostra correlate
  // ================================
  selectIdea(idea: Idea): void {
    this.selectedIdea = idea;
    this.activeTab = 'related';
    this.loadRelatedIdeas();
  }

  // ================================
  // 🔹 Chiama endpoint correlate
  // ================================
  loadRelatedIdeas(): void {
  if (!this.selectedIdea) return;
  console.log(`🔍 Caricamento correlate per idea #${this.selectedIdea.id}`);

  this.loading = true;
  this.error = null;
  this.infoMessage = null;

  const timeout = setTimeout(() => {
    if (this.loading) {
      console.warn('⏳ Timeout caricamento correlate.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }, 10000);

  this.ideasService.getRelatedIdeas(this.selectedIdea.id, {
    cosine: this.cosineWeight,
    keywords: this.keywordWeight,
    category: this.categoryWeight
  })
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (res) => {
      clearTimeout(timeout);
      this.relatedIdeas = res.related || [];
      this.loading = false;

      // 🧩 Gestione meta informativa
      if (res.meta) {
        if (res.meta.message) this.infoMessage = res.meta.message;
        else if (res.meta.auto_generated_embedding)
          this.infoMessage = '✅ Embedding generato automaticamente.';
        else if (res.meta.count === 0)
          this.infoMessage = '😕 Nessuna idea correlata trovata.';
      }

      console.log(`✅ Ricevute ${this.relatedIdeas.length} correlate`);
      this.cdr.detectChanges();
    },
    error: (err) => {
      clearTimeout(timeout);
      console.error('❌ Errore correlate:', err);
      if (err.message?.includes('embedding')) {
        this.error = '⚙️ Genera l\'embedding prima di cercare correlate.';
      } else {
        this.error = err.message || 'Errore durante il caricamento delle correlate.';
      }
      this.loading = false;
      this.cdr.detectChanges();
    },
    complete: () => {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}


  // ================================
  // 🔹 Cambia tab manualmente
  // ================================
  setTab(tab: 'mine' | 'related' | 'stats'): void {
    this.activeTab = tab;
    this.infoMessage = null;
    this.error = null;
  }

  // ================================
  // 🔹 Aggiorna pesi e ricarica correlate
  // ================================
  refreshWeights(): void {
    this.loadRelatedIdeas();
  }

  // ================================
  // 🔹 Carica statistiche
  // ================================
 loadInsights(): void {
  console.log('📊 Caricamento statistiche idee...');
  this.ideasService.getInsights()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.insights = res;
        console.log('✅ Statistiche caricate:', res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Errore insight:', err);
        this.cdr.detectChanges();
      }
    });
}

}
