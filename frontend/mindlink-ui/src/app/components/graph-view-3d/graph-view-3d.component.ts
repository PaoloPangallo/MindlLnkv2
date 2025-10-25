import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';

import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, retry } from 'rxjs/operators';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import {AsyncPipe, NgIf} from '@angular/common';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {Idea} from "../../models/idea.model";
import {Connection} from "../../models/connection.model";
import {ApiService} from "../../services/api.service";

// Strong Typing
interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ...
interface GraphNode {
  id: string;
  name: string;
  group: string;
  summary: string;
  color: string;
  outgoing_connections?: Connection[];
  originalData: Idea; // 👈 Aggiungi questa riga
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  type: string;
}



@Component({
  selector: 'app-graph-view-3d',
  templateUrl: './graph-view-3d.component.html',
  styleUrls: ['./graph-view-3d.component.scss'],
  standalone: true,
  imports: [NgIf, AsyncPipe]
})
export class GraphView3dComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('graphContainer', { static: false }) graphContainer!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private Graph: any;

  // State Management con BehaviorSubject
  isLoading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  nodeCount$ = new BehaviorSubject<number>(0);
  linkCount$ = new BehaviorSubject<number>(0);
  autoRotate$ = new BehaviorSubject<boolean>(true);

  private hoveredNode: any = null;
  private animationFrameId: number | null = null;
  private allNodes: GraphNode[] = []; // Cache per la ricerca
  private lastFrameTime = performance.now();
  private fpsCounter = 0;
  protected fpsValue$ = new BehaviorSubject<number>(60);

constructor(
    private apiService: ApiService,
    private zone: NgZone,
    private cd: ChangeDetectorRef
  ) {}

  private toThreeColor(hex?: string): THREE.Color {
    try {
      return new THREE.Color(hex && hex.trim() ? hex : '#3b82f6');
    } catch {
      return new THREE.Color('#3b82f6');
    }
  }





  ngOnInit(): void {

    // Nulla da fare qui - aspettiamo AfterViewInit
  }

ngAfterViewInit(): void {
    this.loadGraphData();
  this.startPerformanceMonitor();
  }


  private loadProgress$ = new BehaviorSubject<number>(0);

private simulateProgress(): void {
  this.loadProgress$.next(0);
  let progress = 0;

  const step = () => {
    if (progress < 90 && this.isLoading$.value) {
      progress += Math.random() * 5;
      this.loadProgress$.next(Math.min(90, progress));
      setTimeout(step, 200);
    } else if (!this.isLoading$.value) {
      this.loadProgress$.next(100);
    }
  };
  step();
}

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();

  [this.isLoading$, this.error$, this.nodeCount$, this.linkCount$, this.autoRotate$, this.fpsValue$, this.loadProgress$]
    .forEach(s => s.complete());

  this.cleanup();
}




  loadGraphData(): void {
  this.isLoading$.next(true);
  this.error$.next(null);

  this.apiService.getIdeas()
    .pipe(retry(1), takeUntil(this.destroy$))
    .subscribe({
      next: (ideas) => {
        const graphData = this.transformData(ideas);
        this.allNodes = graphData.nodes;

        this.nodeCount$.next(graphData.nodes.length);
        this.linkCount$.next(graphData.links.length);
        this.isLoading$.next(false);

        if (!this.Graph) {
          this.initGraph(graphData);
        } else {
          // Aggiornamento reattivo (senza re-render completo)
          this.Graph.graphData(graphData);
        }

        // Fade-in dolce
        this.zone.runOutsideAngular(() => {
          const el = this.graphContainer.nativeElement;
          el.style.opacity = '0';
          requestAnimationFrame(() => (el.style.transition = 'opacity .5s ease-in-out'));
          requestAnimationFrame(() => (el.style.opacity = '1'));
        });
      },
      error: (err) => {
        console.error('Errore caricamento grafo:', err);
        this.error$.next('Impossibile caricare il grafo. Verifica la connessione.');
        this.isLoading$.next(false);
      }
    });
}


  // =======================================================
  // 🚀 FUNZIONALITÀ AI (Metodi pubblici per l'HTML)
  // =======================================================
private setLoading(message?: string): void {
  this.zone.run(() => {
    this.isLoading$.next(true);
    if (message) this.error$.next(message);
  });
}

private clearLoading(): void {
  this.zone.run(() => {
    this.isLoading$.next(false);
    this.error$.next(null);
  });
}

private setError(msg: string): void {
  this.zone.run(() => {
    this.error$.next(msg);
    this.isLoading$.next(false);
  });
}

  /** 🚀 Ricalcola i pesi semantici e ricarica il grafo */
  private aiCooldown = false;

onRecalculateWeights(): void {
  if (this.aiCooldown) return;
  this.aiCooldown = true;
  this.setLoading("Ricalcolo connessioni semantiche...");

  this.apiService.recalculateSemanticWeights()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.error$.next("Ricalcolo completato. Aggiorno il grafo...");
        this.loadGraphData();
        setTimeout(() => (this.aiCooldown = false), 2000);
      },
      error: (err) => {
        console.error(err);
        this.setError("Errore durante il ricalcolo dei pesi.");
        setTimeout(() => (this.aiCooldown = false), 2000);
      }
    });
}

  toggleAutoRotate(): void {
    this.autoRotate$.next(!this.autoRotate$.value);
  }

  resetCamera(): void {
    if (this.Graph) {
      this.Graph.cameraPosition({ x: 0, y: 100, z: 400 }, 1000);
      this.autoRotate$.next(true);
    }
  }

  private startPerformanceMonitor(): void {
  let lastUpdate = performance.now();

  const updateFPS = (timestamp: number) => {
    this.fpsCounter++;
    const delta = timestamp - lastUpdate;

    if (delta >= 1000) {
      const fps = Math.round((this.fpsCounter * 1000) / delta);
      this.fpsValue$.next(fps);
      this.fpsCounter = 0;
      lastUpdate = timestamp;
    }

    requestAnimationFrame(updateFPS);
  };

  requestAnimationFrame(updateFPS);
}

  // ...
  private transformData(ideas: Idea[]): GraphData {
    const nodes: GraphNode[] = ideas.map((i) => ({
      id: i.id!.toString(), // Assumi che l'ID esista
      name: i.title,
      group: i.category || 'default',
      summary: i.summary || '',
      color: this.getCategoryColor(i.category),
      outgoing_connections: i.outgoing_connections,
      originalData: i // 👈 Aggiungi questa riga
    }));

    const links: GraphLink[] = ideas.flatMap((i) =>
      (i.outgoing_connections || []).map((conn) => ({
        source: conn.source.toString(),
        target: conn.target.toString(),
        value: conn.strength || 1,
        type: conn.type || 'unknown'
      }))
    );

    return { nodes, links };
  }



  // ...
  private getCategoryColor(category?: string): string {
    const colors: { [key: string]: string } = {
      // 🎨 Corrispondenza con le categorie del backend
      tecnologia: '#3b82f6',
      educazione: '#10b981',
      ambiente: '#22c55e',
      salute: '#ec4899',
      economia: '#f59e0b',
      arte: '#8b5cf6',
      societa: '#f43f5e',
      default: '#a1a1aa' // Grigio per default
    };
    return colors[category?.toLowerCase() || 'default'] || colors['default'];
  }
// ...



  private initGraph(graphData: GraphData): void {
  const elem = this.graphContainer.nativeElement;
  const GraphConstructor: any = ForceGraph3D;

  this.Graph = GraphConstructor()(elem)
    .graphData(graphData)
    .nodeThreeObject((node: GraphNode) => this.createNodeObject(node))
    .nodeVal((n: GraphNode) => 8 + Math.sqrt(n.outgoing_connections?.length || 0) * 3)
    .linkColor((l: GraphLink) => this.getLinkColor(l))
    .linkWidth((l: GraphLink) => Math.max(1, l.value * 3))
    .linkOpacity(0.5)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleSpeed(0.004)
    .backgroundColor('#0f172a')
    .showNavInfo(false)
    .enableNodeDrag(false)
    .enablePointerInteraction(true)
    .onNodeHover((n: any) => this.handleNodeHover(n))
    .onNodeClick((n: any) => this.handleNodeClick(n));

  // Forze (repulsione e link)
  const charge = this.Graph.d3Force('charge');
  if (charge) (charge as any).strength(-600);

  const linkForce = this.Graph.d3Force('link');
  if (linkForce) {
    (linkForce as any).distance(160);
    (linkForce as any).strength(0.5);
  }

  // Luci migliorate
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(200, 150, 100);
  this.Graph.scene().add(ambient, directional);

  this.Graph.cameraPosition({ x: 0, y: 80, z: 420 });
  this.setupMouseControls();
  this.startAnimation();

  Promise.resolve().then(() => this.cd.detectChanges());
}


  private createNodeObject(node: GraphNode): THREE.Group {
    const group = new THREE.Group();
    const baseSize = 7;

    const geometry = new THREE.IcosahedronGeometry(baseSize, 5);
    const c = this.toThreeColor(node.color);
    const material = new THREE.MeshPhongMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: 0.5,
      shininess: 150
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    const glowGeometry1 = new THREE.IcosahedronGeometry(baseSize + 1.5, 4);
    const glowMaterial1 = new THREE.MeshBasicMaterial({
      color: node.color as THREE.ColorRepresentation,

      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const glowSphere1 = new THREE.Mesh(glowGeometry1, glowMaterial1);
    group.add(glowSphere1);

    const glowGeometry2 = new THREE.IcosahedronGeometry(baseSize + 3, 3);
    const glowMaterial2 = new THREE.MeshBasicMaterial({
      color: node.color as THREE.ColorRepresentation,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const glowSphere2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
    group.add(glowSphere2);

    const ringGeometry = new THREE.TorusGeometry(baseSize + 2, 0.4, 16, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: node.color as THREE.ColorRepresentation,

      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI * 0.3;
    ring.rotation.z = Math.PI * 0.2;
    group.add(ring);

    // Label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'node-label';
    labelDiv.textContent = node.name.substring(0, 22);
    labelDiv.setAttribute('role', 'tooltip');
    labelDiv.setAttribute('aria-label', node.name);

    const labelObj = new CSS2DObject(labelDiv);
    labelObj.position.set(0, 16, 0);
    group.add(labelObj);

    // Tooltip
    const tooltipDiv = document.createElement('div');
    tooltipDiv.className = 'node-tooltip';
    tooltipDiv.setAttribute('role', 'status');
    tooltipDiv.setAttribute('aria-live', 'polite');
    tooltipDiv.innerHTML = `
      <div class="tooltip-header">
        <strong>${this.sanitizeHTML(node.name)}</strong>
      </div>
      <div class="tooltip-category">
        <em>${this.sanitizeHTML(node.group)}</em>
      </div>
      <small>${this.sanitizeHTML(node.summary)}</small>
    `;

    const tooltipObj = new CSS2DObject(tooltipDiv);
    tooltipObj.position.set(0, 25, 0);
    group.add(tooltipObj);

    group.userData = { sphere, glowSphere1, glowSphere2, ring, tooltipDiv };

    return group;
  }

  private handleNodeHover(node: any): void {
  if (this.hoveredNode === node) return;

  // Ripristina nodo precedente
  if (this.hoveredNode?.__threeObj?.userData) {
    const ud = this.hoveredNode.__threeObj.userData;
    if (ud.sphere) (ud.sphere.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
    if (ud.tooltipDiv) ud.tooltipDiv.style.display = 'none';
  }

  this.hoveredNode = node;

  // Evidenzia nodo attuale
  if (node?.__threeObj?.userData) {
    const ud = node.__threeObj.userData;
    if (ud.sphere) (ud.sphere.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.2;
    if (ud.tooltipDiv) ud.tooltipDiv.style.display = 'block';
  }
}

 private handleNodeClick(node: GraphNode): void {
    if (node) {
      this.autoRotate$.next(false);

      // ✅ ERRORE CORRETTO (TS1109 e TS6133)
      // Questa è la logica di calcolo che mancava
      const distance = 180;
      const camera = this.Graph.camera();
      const camPos = camera.position;
      const nodePos = node as any; // Il nodo ha x, y, z

      const dx = nodePos.x - camPos.x;
      const dy = nodePos.y - camPos.y;
      const dz = nodePos.z - camPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0) { // Evita divisione per zero
        this.Graph.cameraPosition({
          x: nodePos.x - (dx / dist) * distance,
          y: nodePos.y - (dy / dist) * distance,
          z: nodePos.z - (dz / dist) * distance
        }, 1200);
      }

      // 🚀 Logica AI (questa era già corretta)
      const ideaContent = node.originalData?.content || node.name;

      console.log(`%cCerco idee simili a: "${node.name}"`, "color: #3b82f6; font-weight: bold;");
      this.apiService.findSimilarIdeas(ideaContent)
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          console.log('Idee simili trovate:', response.results);
          this.highlightSimilarNodes(response.results.map(r => r.id.toString()));
        });

      setTimeout(() => {
        this.autoRotate$.next(true);
      }, 5000);
    }
  }

  /** 🚀 EVIDENZIA NODI SIMILI (Esempio) */
  private highlightSimilarNodes(similarIds: string[]): void {
  const similarSet = new Set(similarIds);

  this.allNodes.forEach((n: any) => {
    const obj = n.__threeObj;
    if (!obj?.userData?.sphere) return;

    const mat = obj.userData.sphere.material as THREE.MeshPhongMaterial;
    const isSimilar = similarSet.has(n.id);

    mat.emissiveIntensity = isSimilar ? 1.6 : 0.4;
    mat.opacity = isSimilar ? 1.0 : 0.25;
    mat.transparent = true;
  });
}


  private setupMouseControls(): void {
    const container = this.graphContainer.nativeElement;
    let isRotating = false;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    container.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const camera = this.Graph.camera();
      const newZ = Math.max(150, Math.min(1200, camera.position.z + e.deltaY * 0.3));
      this.Graph.cameraPosition({ z: newZ }, 200);
    });

    container.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        isRotating = true;
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (e.button === 2) {
        isDragging = true;
      }
    });

    container.addEventListener('mouseup', () => {
      isRotating = false;
      isDragging = false;
    });

    container.addEventListener('mousemove', (e: MouseEvent) => {
      if (isRotating) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        const camera = this.Graph.camera();
        const distance = Math.sqrt(
          camera.position.x ** 2 +
          camera.position.y ** 2 +
          camera.position.z ** 2
        );

        const theta = Math.atan2(camera.position.x, camera.position.z) - deltaX * 0.003;
        const phi = Math.acos(camera.position.y / distance) - deltaY * 0.003;
        const clampedPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

        const newX = distance * Math.sin(clampedPhi) * Math.sin(theta);
        const newY = distance * Math.cos(clampedPhi);
        const newZ = distance * Math.sin(clampedPhi) * Math.cos(theta);

        this.Graph.cameraPosition({ x: newX, y: newY, z: newZ }, 100);
      } else if (isDragging) {
        const camera = this.Graph.camera();
        this.Graph.cameraPosition({
          x: camera.position.x - (e.clientX - lastX) * 0.008,
          y: camera.position.y + (e.clientY - lastY) * 0.008
        }, 100);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    container.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.resetCamera();
      }
    });
  }

  private startAnimation(): void {
  this.zone.runOutsideAngular(() => {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.Graph?.scene() && this.autoRotate$.value) {
        this.Graph.scene().rotation.y += 0.00045;
      }
    };
    animate();
  });
}


 private cleanup(): void {
  if (this.Graph) {
    const renderer = this.Graph.renderer?.();
    if (renderer && 'dispose' in renderer) (renderer as any).dispose();

    this.Graph.scene().clear();
    this.Graph = null;
  }

  const container = this.graphContainer?.nativeElement;
  if (container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
}

private getLinkColor(link: GraphLink): string {
  const t = Math.min(1, link.value);
  const color = new THREE.Color();
  color.setHSL(0.6 - 0.6 * t, 1.0, 0.55);
  return color.getStyle();
}


  private sanitizeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

}
