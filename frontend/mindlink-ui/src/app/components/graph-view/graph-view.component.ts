import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';

cytoscape.use(cytoscapeDagre);

// ======================
// 🔹 Interfaces
// ======================
interface Connection {
  id: number;
  source: number;
  target: number;
  type: string;
}

interface Idea {
  id?: number;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  outgoing_connections?: Connection[];
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  category: string;
  summary: string;
}

// ======================
// 🔹 Component
// ======================
@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.scss'],
})
export class GraphViewComponent implements OnInit, OnDestroy {
  @ViewChild('cyContainer', { static: true }) cyContainer!: ElementRef;
  private cy!: Core;

  // Stato UI
  isLoading = false;
  error: string | null = null;
  selectedNodeId: string | null = null;

  // Tooltip
  tooltip: TooltipData = { visible: false, x: 0, y: 0, title: '', category: '', summary: '' };

  // Nuova idea
  newIdea: Partial<Idea> = { title: '', content: '', category: '', summary: '' };
  formSubmitted = false;

  // Destroy notifier
  private readonly destroy$ = new Subject<void>();

  // Tavolozze di colore
  private readonly categoryColors: Record<string, string> = {
    algoritmi: '#00d4ff',
    ai: '#ff006e',
    web: '#8338ec',
    mobile: '#ff006e',
    design: '#fb5607',
    default: '#06ffa5',
  };

  constructor(private http: HttpClient, private zone: NgZone) {}

  // ======================
  // ⚙️ Lifecycle
  // ======================
  ngOnInit(): void {
    this.loadGraphData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cy?.destroy();
  }

  // ======================
  // 📡 API e gestione dati
  // ======================
  createIdea(): void {
    this.formSubmitted = true;

    if (!this.isFormValid()) {
      this.error = 'Compila tutti i campi obbligatori';
      return;
    }

    this.isLoading = true;
    this.http
      .post<Idea>('/api/ideas/', this.newIdea)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
          this.loadGraphData();
        },
        error: (err) => {
          console.error('❌ Errore creazione idea:', err);
          this.error = 'Errore nella creazione dell’idea';
          this.isLoading = false;
        },
      });
  }

  private loadGraphData(): void {
    this.isLoading = true;
    this.http
      .get<Idea[]>('/api/ideas/')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ideas) => {
          const elements = this.buildGraphElements(ideas);
          this.initCytoscape(elements);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Errore caricamento grafo:', err);
          this.error = 'Errore nel caricamento del grafo';
          this.isLoading = false;
        },
      });
  }

  // ======================
  // 🧠 Helpers
  // ======================
  private isFormValid(): boolean {
    return Boolean(this.newIdea.title?.trim() && this.newIdea.content?.trim());
  }

  private resetForm(): void {
    this.newIdea = { title: '', content: '', category: '', summary: '' };
    this.formSubmitted = false;
    this.error = null;
  }

  private getNodeColor(category: string): string {
    return this.categoryColors[category.toLowerCase()] || this.categoryColors['default'];
  }

  private buildGraphElements(ideas: Idea[]): ElementDefinition[] {
    return ideas.flatMap((idea) => {
      const node: ElementDefinition = {
        data: {
          id: `idea-${idea.id}`,
          label: idea.title,
          summary: idea.summary ?? '',
          category: idea.category ?? 'default',
        },
        classes: [idea.category?.toLowerCase() || 'default'],
      };

      const edges = (idea.outgoing_connections ?? []).map((conn) => ({
        data: {
          id: `conn-${conn.id}`,
          source: `idea-${conn.source}`,
          target: `idea-${conn.target}`,
          label: conn.type ?? '',
        },
      }));

      return [node, ...edges];
    });
  }

  // ======================
  // 🎨 Inizializzazione Cytoscape
  // ======================
  private initCytoscape(elements: ElementDefinition[]): void {
    this.cy?.destroy();

    const nodeColor = (node: any) => this.getNodeColor(node.data('category'));

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements,
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        spacingFactor: 1.4,
        nodeSep: 80,
        rankSep: 140,
      } as any,
      style: this.getGraphStyle(nodeColor),
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      autoungrabify: false,
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    this.setupEventHandlers();
  }

  // ======================
  // 🧩 Stile modulare (resta nel TS ma compatto)
  // ======================
  private getGraphStyle(nodeColor: (node: any) => string): cytoscape.StylesheetCSS[] {
  return [
    {
      selector: 'node',
      css: {
        'background-color': (node: any) => nodeColor(node),
        'border-color': (node: any) => nodeColor(node),
        'border-width': 2.5,
        width: 130,
        height: 70,
        'background-opacity': 0.95,
        label: 'data(label)',
        color: '#fff',
        'font-weight': 600,
        'font-size': '13px',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-outline-width': 2,
        'text-outline-color': '#000',
      } as any, // 👈 necessario per permettere le funzioni dinamiche
    },
    {
      selector: 'node:hover',
      css: {
        'background-opacity': 1,
        width: 150,
        height: 80,
        'border-width': 3,
      } as any,
    },
    {
      selector: 'node.selected',
      css: {
        width: 150,
        height: 80,
        'border-width': 3.5,
        'border-color': '#06ffa5',
      } as any,
    },
    {
      selector: 'edge',
      css: {
        width: 2,
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '11px',
        color: '#94a3b8',
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.9,
        'text-background-padding': 4,
        opacity: 0.75,
      } as any,
    },
    {
      selector: 'edge:hover',
      css: {
        'line-color': '#06ffa5',
        'target-arrow-color': '#06ffa5',
        width: 3,
        opacity: 1,
      } as any,
    },
  ];
}





  // ======================
  // 🖱️ Eventi utente
  // ======================
  private setupEventHandlers(): void {
    // Tooltip hover
    this.cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const rect = this.cyContainer.nativeElement.getBoundingClientRect();

      this.zone.run(() => {
        this.tooltip = {
          visible: true,
          x: event.renderedPosition.x + rect.left + 15,
          y: event.renderedPosition.y + rect.top + 15,
          title: node.data('label'),
          category: node.data('category'),
          summary: node.data('summary'),
        };
      });
    });

    this.cy.on('mouseout', 'node', () => {
      this.zone.run(() => (this.tooltip.visible = false));
    });

    // Selezione nodo
    this.cy.on('tap', 'node', (event) => {
      this.cy.elements().removeClass('selected');
      event.target.addClass('selected');
      this.selectedNodeId = event.target.id();
    });

    // Click su vuoto → deselezione
    this.cy.on('tap', (evt) => {
      if (evt.target === this.cy) {
        this.cy.elements().removeClass('selected');
        this.selectedNodeId = null;
      }
    });
  }
}
