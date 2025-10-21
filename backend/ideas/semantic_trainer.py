import logging
import os, random

import numpy as np
from sentence_transformers import SentenceTransformer, losses, InputExample
from torch.utils.data import DataLoader
from ideas.models import Idea, Connection

logger = logging.getLogger(__name__)


def fine_tune_model():
    ideas = list(Idea.objects.filter(used_for_training=False)[:50])
    if len(ideas) < 10:
        print("⏳ Meno di 10 nuove idee, salto il training.")
        return

    # Carica modello base o ultimo salvato
    base_path = "models"
    latest_versions = sorted([f for f in os.listdir(base_path) if f.startswith("mindlink-v")])
    model_path = os.path.join(base_path, latest_versions[-1]) if latest_versions else "all-MiniLM-L6-v2"
    model = SentenceTransformer(model_path)

    # 🔹 Crea coppie (simili/dissimili)
    train_examples = []
    for i in ideas:
        positive = random.choice(ideas)
        negative = random.choice([x for x in ideas if x.id != positive.id])
        train_examples.append(InputExample(texts=[i.content, positive.content], label=1.0))
        train_examples.append(InputExample(texts=[i.content, negative.content], label=0.0))

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=8)
    train_loss = losses.CosineSimilarityLoss(model)

    print("🎯 Inizio fine-tuning incrementale su 50 idee...")
    model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=1, show_progress_bar=True)

    # 🔹 Salva nuova versione del modello
    version = len(latest_versions) + 1
    new_path = os.path.join(base_path, f"mindlink-v{version}")
    model.save(new_path)
    print(f"✅ Nuovo modello salvato in {new_path}")

    # 🔹 Marca le idee come usate
    Idea.objects.filter(id__in=[i.id for i in ideas]).update(used_for_training=True)
    print("📘 Marcate 50 idee come addestrate.")

    # 🔹 Aggiorna le connessioni pesate
    update_semantic_connections(model)
    print("⚖️ Connessioni semantiche aggiornate con pesatura automatica.")


def update_semantic_connections(model=None, top_k: int = 5, strong_thr: float = 0.85, weak_thr: float = 0.6):
    """
    Aggiorna/crea connessioni semantiche pesate tra idee.
    🔹 Usa gli embedding già salvati nel DB (evita ricodifica da testo)
    🔹 Normalizza i vettori per cosine similarity stabile
    🔹 Mantiene solo le top-k connessioni più forti per nodo
    🔹 Logga metriche aggregate di qualità
    """

    ideas = list(Idea.objects.exclude(embedding=None))
    if len(ideas) < 2:
        logger.info("ℹ️ Troppe poche idee per aggiornare connessioni.")
        return

    # === Embedding Matrix ===
    embeddings = np.array([np.array(i.embedding, dtype=float) for i in ideas])
    # Normalizzazione vettori (unit length)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = np.divide(embeddings, norms, out=np.zeros_like(embeddings), where=norms != 0)

    # === Similarity Matrix ===
    sim_matrix = np.dot(embeddings, embeddings.T)
    np.fill_diagonal(sim_matrix, 0.0)  # azzera self-similarity

    new_connections = 0
    updated_connections = 0
    total_strong = 0
    total_weak = 0

    # === Aggiornamento connessioni ===
    for i, source in enumerate(ideas):
        # Trova le top-k connessioni più simili
        top_indices = np.argsort(sim_matrix[i])[::-1][:top_k]

        for j in top_indices:
            sim = float(sim_matrix[i, j])
            if sim < weak_thr:
                continue

            target = ideas[j]
            ctype = "semantic_strong" if sim >= strong_thr else "semantic_weak"

            conn, created = Connection.objects.update_or_create(
                source=source,
                target=target,
                defaults={"strength": sim, "type": ctype}
            )

            if created:
                new_connections += 1
            else:
                updated_connections += 1

            if ctype == "semantic_strong":
                total_strong += 1
            else:
                total_weak += 1

    # === Metriche di qualità ===
    avg_sim = np.mean(sim_matrix[sim_matrix > 0])
    std_sim = np.std(sim_matrix[sim_matrix > 0])

    logger.info(
        f"🔗 Connessioni aggiornate: {new_connections} nuove, {updated_connections} modificate. "
        f"(Strong: {total_strong}, Weak: {total_weak})"
    )
    logger.info(f"📊 Similarità media={avg_sim:.4f}, deviazione={std_sim:.4f}")

    print(f"✅ Connessioni semantiche aggiornate: {new_connections} nuove, {updated_connections} aggiornate.")
    print(f"   Strong={total_strong}, Weak={total_weak}, AvgSim={avg_sim:.3f}")


from datetime import datetime

def force_training_now():
        """
        🔹 Avvia il training istantaneo manualmente (richiamato dall'admin).
        """
        try:
            print(f"⚙️ [Admin Trigger] Avvio training manuale alle {datetime.now().strftime('%H:%M:%S')} ...")
            fine_tune_model()
            return {"status": "ok", "message": "Training istantaneo completato con successo."}
        except Exception as e:
            return {"status": "error", "message": str(e)}