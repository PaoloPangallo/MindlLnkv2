import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';

cytoscape.use(cytoscapeDagre);

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

@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.scss'],
})
export class GraphViewComponent implements OnInit, OnDestroy {
  @ViewChild('cyContainer', { static: true }) cyContainer!: ElementRef;

  cy!: Core;
  isLoading = false;
  error: string | null = null;
  formSubmitted = false;

  tooltip: TooltipData = {
    visible: false,
    x: 0,
    y: 0,
    title: '',
    category: '',
    summary: '',
  };

  newIdea: Partial<Idea> = {
    title: '',
    content: '',
    category: '',
    summary: ''
  };

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadGraphData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.cy) this.cy.destroy();
  }

  createIdea(): void {
    this.formSubmitted = true;

    if (!this.isFormValid()) {
      this.error = 'Compilare tutti i campi obbligatori';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.http
      .post<Idea>('/api/ideas/', this.newIdea)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
          this.isLoading = false;
          this.loadGraphData();
        },
        error: (err) => {
          console.error('Errore creazione idea:', err);
          this.error = 'Errore nella creazione dell\'idea';
          this.isLoading = false;
        },
      });
  }

  private isFormValid(): boolean {
    return (
      this.newIdea.title?.trim().length! > 0 &&
      this.newIdea.content?.trim().length! > 0
    );
  }

  private resetForm(): void {
    this.newIdea = { title: '', content: '', category: '', summary: '' };
    this.formSubmitted = false;
    this.error = null;
  }

  private loadGraphData(): void {
    this.isLoading = true;

    this.http
      .get<Idea[]>('/api/ideas/')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ideas) => {
          this.error = null;
          this.isLoading = false;
          const elements = this.buildGraphElements(ideas);
          this.initCytoscape(elements);
        },
        error: (err) => {
          console.error('Errore caricamento grafo:', err);
          this.error = 'Errore nel caricamento del grafo';
          this.isLoading = false;
        },
      });
  }

  private buildGraphElements(ideas: Idea[]): ElementDefinition[] {
  return ideas.flatMap((idea) => {
    const node: ElementDefinition = {
      data: {
        id: `idea-${idea.id}`,
        label: idea.title,
        summary: idea.summary || '',
        category: idea.category || '',
      },
      classes: this.getNodeClasses(idea.category),
    };

    const edges = (idea.outgoing_connections || []).map((conn) => ({
      data: {
        id: `conn-${conn.id}`,
        source: `idea-${conn.source}`,
        target: `idea-${conn.target}`,
        label: conn.type || '',
      },
    }));

    return [node, ...edges];
  });
}


  private getNodeClasses(category?: string): string[] {
    return category ? [category.toLowerCase()] : [];
  }

  private initCytoscape(elements: ElementDefinition[]): void {
    if (this.cy) this.cy.destroy();

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements,
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        spacingFactor: 1.2,
        nodeSep: 50,
        rankSep: 100,
      } as any,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#3b82f6',
            label: 'data(label)',
            color: '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-outline-width': 2,
            'text-outline-color': '#1e3a8a',
            width: '120px',
            height: '60px',
            'border-width': 2,
            'border-color': '#1e3a8a',
          },
        },
        {
  selector: 'node:hover',
  style: {
    'background-color': '#2563eb',
    'overlay-color': '#3b82f6',
    'overlay-opacity': 0.25,
    'overlay-padding': 8,
  },
},


        {
  selector: 'node.selected',
  style: {
    'background-color': '#1e40af',
    'overlay-color': '#1e40af',
    'overlay-opacity': 0.4,
    'overlay-padding': 10,
  },
},

        {
          selector: 'edge',
          style: {
            width: 2.5,
            'line-color': '#9ca3af',
            'target-arrow-color': '#9ca3af',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '11px',
            color: '#6b7280',
            'text-background-color': '#fff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            width: 3,
          },
        },
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const rect = this.cyContainer.nativeElement.getBoundingClientRect();

      this.tooltip = {
        visible: true,
        x: event.renderedPosition.x + rect.left + 10,
        y: event.renderedPosition.y + rect.top + 10,
        title: node.data('label'),
        category: node.data('category'),
        summary: node.data('summary'),
      };
    });

    this.cy.on('mouseout', 'node', () => {
      this.tooltip.visible = false;
    });

    this.cy.on('tap', 'node', (event) => {
      this.cy.elements().removeClass('selected');
      event.target.addClass('selected');
    });

    this.cy.on('tap', (evt) => {
  const target = evt.target;
  if (target === this.cy || !target.isNode()) {
    this.cy.elements().removeClass('selected');
  }
});
  }
}
