import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Sigma from 'sigma';
import Graph from 'graphology';
import circular from 'graphology-layout/circular';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import {Idea} from "../../models/idea.model";
import {CommonModule, NgForOf, NgIf, TitleCasePipe} from "@angular/common";
import {FormsModule} from "@angular/forms";
import { GraphFilterService } from '../../services/graph-filter.service';
import { SearchPanelComponent } from '../search-panel/search-panel.component';


// ======================
// 🔹 Interfaces
// ======================

interface NodeAttributes {
  label: string;
  summary?: string;
  category?: string;
  color: string;
  x: number;
  y: number;
  size: number;
  hidden?: boolean; // ✅ aggiungi questa riga
}





interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  category: string;
  summary: string;
}

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  categories: string[];
}

// ======================
// 🔹 Component
// ======================
@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    FormsModule,
    TitleCasePipe,
    SearchPanelComponent,
    NgForOf,
    CommonModule
  ],
  standalone: true
})
export class GraphViewComponent implements OnInit, OnDestroy {
  @ViewChild('sigmaContainer', { static: true }) sigmaContainer!: ElementRef;
  private sigmaInstance!: Sigma<NodeAttributes>;
  private graph!: Graph<NodeAttributes, any>; // ✅ qui va bene
  private destroy$ = new Subject<void>();
  private originalNodes: any[] = [];
  private originalLinks: any[] = [];



  // Stato UI
  isLoading = false;
  error: string | null = null;
  selectedNodeId: string | null = null;
  graphStats: GraphStats = { totalNodes: 0, totalEdges: 0, categories: [] };
  showLegend = true;

  tooltip: TooltipData = {
    visible: false,
    x: 0,
    y: 0,
    title: '',
    category: '',
    summary: '',
  };

  // Form
  newIdea: Partial<Idea> = { title: '', content: '', category: '', summary: '' };
  formSubmitted = false;
  showSuccessMessage = false;
  successMessage = '';

  private readonly formReset$ = new Subject<void>();

  private readonly categoryColors: Record<string, { primary: string; secondary: string }> = {
    algoritmi: { primary: '#00d4ff', secondary: 'rgba(0, 212, 255, 0.15)' },
    ai: { primary: '#ff006e', secondary: 'rgba(255, 0, 110, 0.15)' },
    web: { primary: '#8338ec', secondary: 'rgba(131, 56, 236, 0.15)' },
    mobile: { primary: '#ff006e', secondary: 'rgba(255, 0, 110, 0.15)' },
    design: { primary: '#fb5607', secondary: 'rgba(251, 86, 7, 0.15)' },
    default: { primary: '#06ffa5', secondary: 'rgba(6, 255, 165, 0.15)' },
  };

  categoryList = Object.entries(this.categoryColors).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    color: val.primary,
  }));

  constructor(
    private http: HttpClient,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private graphFilter: GraphFilterService
  ) {}

 ngOnInit() {
  this.isLoading = true;
  this.error = null;
  this.cdr.markForCheck();

  // 🔹 1. Carica tutte le idee dal backend
  this.http
    .get<Idea[]>('/api/ideas/')
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (ideas) => {
        // ✅ costruisci il grafo
        this.buildSigmaGraph(ideas);

        // 🔄 aggiorna statistiche e stato UI
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Errore caricamento grafo:', err);
        this.error = 'Impossibile caricare il grafo.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });

  // 🔹 2. Sottoscrizione al servizio di ricerca
  this.graphFilter.searchQuery$
    .pipe(takeUntil(this.destroy$))
    .subscribe((query) => {
      this.applySearch(query);
    });
}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.formReset$.complete();
    this.sigmaInstance?.kill();
  }

  // ======================
  // 📡 API
  // ======================
  private loadGraphData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.http
      .get<Idea[]>('/api/ideas/')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ideas) => {
          this.buildSigmaGraph(ideas);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ Errore caricamento grafo:', err);
          this.error = 'Impossibile caricare il grafo.';
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ======================
  // 🧠 Build Graph
  // ======================
  private buildSigmaGraph(ideas: Idea[]): void {
    if (this.sigmaInstance) this.sigmaInstance.kill();

    this.graph = new Graph();

    // 🔹 Aggiungi nodi
    ideas.forEach((idea) => {
      const colors = this.getNodeColor(idea.category || '');
      this.graph.addNode(`idea-${idea.id}`, {
        label: idea.title,
        x: Math.random(),
        y: Math.random(),
        size: 10,
        color: colors.primary,
        summary: idea.summary || '',
        category: idea.category || 'default',
      });
    });

    // 🔹 Aggiungi archi
    ideas.forEach((idea) => {
      (idea.outgoing_connections || []).forEach((conn) => {
        const src = `idea-${conn.source}`;
        const tgt = `idea-${conn.target}`;
        if (this.graph.hasNode(src) && this.graph.hasNode(tgt)) {
          this.graph.addEdge(src, tgt, {
            label: conn.type,
            color: '#475569',
          });
        }
      });
    });

    // 🔹 Layout iniziale
    circular.assign(this.graph);
   forceAtlas2.assign(this.graph, {
  iterations: 150,
  settings: {
    gravity: 0.01,          // forza verso il centro (bassa = più spazio)
    scalingRatio: 10,       // aumenta la distanza media tra nodi
    slowDown: 2,            // smorza le oscillazioni
    edgeWeightInfluence: 0, // ignora peso archi (layout più simmetrico)
  },
});


    // 🔹 Inizializza Sigma
    this.sigmaInstance = new Sigma(this.graph, this.sigmaContainer.nativeElement, {
      renderLabels: true,
      labelDensity: 1,
      allowInvalidContainer: true,
    });

    this.setupEventHandlers();
    this.calculateGraphStats(ideas);
  }

  private getNodeColor(category: string) {
    return this.categoryColors[category?.toLowerCase()] || this.categoryColors['default'];
  }

  private calculateGraphStats(ideas: Idea[]) {
    const cats = new Set<string>();
    ideas.forEach((i) => i.category && cats.add(i.category.toLowerCase()));
    this.graphStats = {
      totalNodes: ideas.length,
      totalEdges: this.graph.size,
      categories: Array.from(cats),
    };
  }

  // ======================
  // 🖱️ Eventi Sigma
  // ======================
  private setupEventHandlers(): void {
    const renderer = this.sigmaInstance.getCamera();

    // Hover: mostra tooltip
    this.sigmaInstance.on('enterNode', ({ node }) => {
      const attrs = this.graph.getNodeAttributes(node);
      const rect = this.sigmaContainer.nativeElement.getBoundingClientRect();

      this.zone.run(() => {
            this.tooltip = {
      visible: true,
      x: rect.left + window.innerWidth / 2,
      y: rect.top + window.innerHeight / 2,
      title: attrs.label ?? '',
      category: attrs.category ?? '',
      summary: attrs.summary ?? '',
    };

        this.cdr.markForCheck();
      });
    });

    this.sigmaInstance.on('leaveNode', () => {
      this.zone.run(() => {
        this.tooltip.visible = false;
        this.cdr.markForCheck();
      });
    });

    // Click: evidenzia nodo
    this.sigmaInstance.on('clickNode', ({ node }) => {
      const attrs = this.graph.getNodeAttributes(node);
      this.selectedNodeId = node;

      renderer.animate({ ratio: 0.5 }, { duration: 600 });
      this.zone.run(() => this.cdr.markForCheck());
      console.log(`🟢 Nodo selezionato: ${attrs.label}`);
    });

    this.sigmaInstance.on('clickStage', () => {
      this.selectedNodeId = null;
      this.zone.run(() => this.cdr.markForCheck());
    });
  }

  toggleLegend(): void {
    this.showLegend = !this.showLegend;
    this.cdr.markForCheck();
  }


  // ======================
// ✨ Creazione nuova Idea
// ======================
createIdea(): void {
  this.formSubmitted = true;

  // 🔹 Validazione di base
  if (!this.newIdea.title?.trim() || !this.newIdea.content?.trim()) {
    this.error = 'Compila i campi obbligatori: Titolo e Descrizione';
    this.cdr.markForCheck();
    return;
  }

  this.isLoading = true;
  this.error = null;
  this.cdr.markForCheck();

  this.http
    .post<Idea>('/api/ideas/', this.newIdea)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (idea) => {
        this.successMessage = `✨ Idea "${idea.title}" creata con successo!`;
        this.showSuccessMessage = true;

        // 🔁 Reset form
        this.newIdea = { title: '', content: '', category: '', summary: '' };
        this.formSubmitted = false;

        // 🔄 Ricarica il grafo
        this.loadGraphData();

        // ⏱️ Nasconde messaggio dopo pochi secondi
        setTimeout(() => {
          this.showSuccessMessage = false;
          this.cdr.markForCheck();
        }, 3000);

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Errore creazione idea:', err);
        this.error = 'Errore nella creazione dell\'idea. Riprova più tardi.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
}

private applySearch(query: string) {
  if (!this.graph) return;
  const q = query.toLowerCase();

  this.graph.forEachNode((node, attrs) => {
    const match =
      !q ||
      attrs.label.toLowerCase().includes(q) ||
      (attrs.summary && attrs.summary.toLowerCase().includes(q)) ||
      (attrs.category && attrs.category.toLowerCase().includes(q));

    this.graph.setNodeAttribute(node, 'hidden', !match);
  });

  this.sigmaInstance.refresh(); // aggiorna il rendering
}





}
