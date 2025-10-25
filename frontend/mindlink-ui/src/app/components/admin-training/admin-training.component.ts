import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { Subject, takeUntil, finalize } from 'rxjs';
import { NgIf, NgFor, DatePipe, CommonModule } from '@angular/common';
import {TrainingService} from "../../services/training.services";
import {SnackbarService} from "../../services/snackbar.service";

/** Tipizzazione coerente con backend Django */
interface TrainingResponse {
  status: 'ok' | 'error';
  message: string;
  logs?: string[];
  progress?: number;
  duration?: number;
  timestamp?: string;
}

/** Stati possibili della UI */
type TrainingState = 'idle' | 'pending' | 'success' | 'failure';

@Component({
  selector: 'app-admin-training',
  templateUrl: './admin-training.component.html',
  styleUrls: ['./admin-training.component.scss'],
  standalone: true,
  imports: [NgIf, NgFor, CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTrainingComponent implements OnInit, OnDestroy {
  readonly COMPONENT_NAME = 'AdminTrainingComponent';

  // Stato interno
  isLoading = false;
  state: TrainingState = 'idle';
  statusMessage = '';
  logs: Array<{ timestamp: string; message: string; level: 'info' | 'success' | 'error' | 'warning' }> = [];
  progress = 0;
  duration = 0;

  private readonly destroy$ = new Subject<void>();
  private logScrollTimer?: ReturnType<typeof setTimeout>;
  private trainingStartTime = 0;

  constructor(
    private readonly trainingService: TrainingService,
    private readonly snackbar: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.logEvent('🧠 Componente inizializzato', 'info');
  }

  ngOnInit(): void {
    this.logEvent('Pannello di training pronto', 'info');
  }

  /** Avvia il processo di training */
  initiateTraining(): void {
    if (this.isLoading) {
      this.logEvent('Tentativo di riavvio ignorato: training già in corso', 'warning');
      return;
    }

    this.resetState();
    this.transitionState('pending');
    this.trainingStartTime = Date.now();

    this.logEvent('⚙️ Avvio training istantaneo…', 'info');

    this.trainingService
      .startTraining()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.onTrainingComplete())
      )
      .subscribe({
        next: (response) => this.processSuccess(response as TrainingResponse),        error: (error: any) => this.processError(error)
      });
  }

  /** Gestione risposta positiva dal backend */
  private processSuccess(response: TrainingResponse): void {
    const isOk = response.status === 'ok';
    this.snackbar.success('✅ Training completato con successo!');

    this.transitionState(isOk ? 'success' : 'failure');
    this.statusMessage = response.message || (isOk ? 'Training completato' : 'Errore nel training');
    this.progress = response.progress ?? 100;

    this.logEvent(`✅ ${response.message}`, isOk ? 'success' : 'warning');

    response.logs?.forEach(log => this.logEvent(log, 'info'));
    if (response.duration) this.logEvent(`Durata: ${response.duration} ms`, 'info');

    this.logEvent(`Stato finale: ${this.state.toUpperCase()}`, 'info');
    this.cdr.markForCheck(); // forza update della UI con OnPush
  }

  /** Gestione errori */
  private processError(error: any): void {
    this.transitionState('failure');
    const errorMessage = this.extractErrorMessage(error);
    this.snackbar.error('❌ Errore durante il training!');
    this.statusMessage = errorMessage;
    this.logEvent(`❌ ${errorMessage}`, 'error');
    console.error(`${this.COMPONENT_NAME}: Training fallito`, error);
    this.cdr.markForCheck();
  }

  /** Estrae messaggio d’errore leggibile */
  private extractErrorMessage(error: any): string {
    if (error?.error?.message) return error.error.message;
    if (error?.message) return error.message;
    if (error?.statusText) return `HTTP ${error.status}: ${error.statusText}`;
    return 'Errore sconosciuto durante il training';
  }

  /** Cleanup finale */
  private onTrainingComplete(): void {
    this.isLoading = false;
    this.duration = Date.now() - this.trainingStartTime;
    this.cdr.markForCheck();
  }

  /** Log evento */
  private logEvent(
    message: string,
    level: 'info' | 'success' | 'error' | 'warning' = 'info'
  ): void {
    const timestamp = new Date().toLocaleTimeString('it-IT', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.logs.push({ timestamp, message, level });
    this.scheduleLogScroll();
  }

  /** Scroll automatico log */
  private scheduleLogScroll(): void {
    clearTimeout(this.logScrollTimer);
    this.logScrollTimer = setTimeout(() => {
      const el = document.querySelector('.log-panel__body');
      if (el) el.scrollTop = el.scrollHeight;
    }, 80);
  }

  clearLogs(): void {
    this.logs = [];
    this.logEvent('🧹 Log cancellati', 'warning');
  }

  private resetState(): void {
    this.isLoading = true;
    this.state = 'idle';
    this.logs = [];
    this.statusMessage = '';
    this.progress = 0;
    this.duration = 0;
  }

  private transitionState(newState: TrainingState): void {
    this.state = newState;
    this.isLoading = newState === 'pending';
  }

  get formattedLogs(): string {
    return this.logs.length === 0
      ? '— nessun log disponibile —'
      : this.logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
  }

  get stateLabel(): string {
    const map: Record<TrainingState, string> = {
      idle: 'Pronto',
      pending: 'In corso…',
      success: 'Completato ✅',
      failure: 'Errore ❌'
    };
    return map[this.state];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.logScrollTimer);
  }
}
