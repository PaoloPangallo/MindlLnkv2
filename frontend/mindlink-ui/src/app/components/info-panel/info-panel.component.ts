import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatCardModule} from "@angular/material/card";
import {MatExpansionModule} from "@angular/material/expansion";

@Component({
  standalone: true,
  selector: 'app-info-panel',
  imports: [CommonModule, MatCardModule, MatExpansionModule],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.scss']
})
export class InfoPanelComponent  {
  sections = [
    {
      title: '🔹 Cos’è MindLink',
      content: `
        MindLink è una piattaforma che trasforma le tue idee in una rete semantica interattiva.
        Ogni idea diventa un nodo del grafo, collegato automaticamente ad altri concetti affini
        tramite analisi semantica e vettoriale basata su modelli linguistici.
      `
    },
    {
      title: '🧠 Come funziona il Training',
      content: `
        MindLink utilizza un modello SentenceTransformer (all-MiniLM-L6-v2) o versioni fine-tuned
        addestrate sui tuoi dati. Durante il training, il sistema genera embedding vettoriali
        per ogni idea, normalizzati nello spazio semantico.
        Questi vettori vengono poi usati per calcolare similarità tramite coseno
        e costruire connessioni semantiche tra idee.
      `
    },
    {
      title: '⚙️ Dietro le quinte',
      content: `
        - Il backend Django gestisce salvataggio e analisi tramite signals e funzioni AI centralizzate.
        - Il frontend Angular visualizza il grafo interattivo con Sigma.js e supporta ricerca in tempo reale.
        - Ogni idea è arricchita con: summary, categoria tematica e parole chiave estratte via TF-IDF.
      `
    },
    {
      title: '📈 Come vengono calcolate le connessioni',
      content: `
        Le connessioni tra idee vengono ricalcolate periodicamente confrontando gli embedding.
        Quando la similarità coseno tra due idee supera una soglia (es. 0.6),
        viene creata una connessione “semantic_weak”; se è molto alta (>0.85), una “semantic_strong”.
      `
    },
    {
      title: '🔬 Pipeline completa',
      content: `
        1. Crei o modifichi un’idea
        2. Viene generato l’embedding e analizzata con AI (summary, keywords, category)
        3. Vengono ricalcolate le connessioni semantiche
        4. Il grafo si aggiorna automaticamente
      `
    }
  ];
}
