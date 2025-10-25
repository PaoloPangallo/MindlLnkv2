import logging
import os, random
import numpy as np
from datetime import datetime
from sentence_transformers import SentenceTransformer, losses, InputExample
from torch.utils.data import DataLoader
from ideas.models import Idea, Connection
from django.conf import settings
import torch

logger = logging.getLogger(__name__)

# =====================================================
# 🔹 PARAMETRI GLOBALI CONFIGURABILI
# =====================================================

DEFAULTS = getattr(settings, "MINDLINK_TRAIN", {
    "BATCH_SIZE": 8,
    "EPOCHS": 1,
    "TOP_K": 5,
    "STRONG_THR": 0.85,
    "WEAK_THR": 0.6,
})


# =====================================================
# 🔹 FINE-TUNING INCREMENTALE DEL MODELLO
# =====================================================

def fine_tune_model():
    ideas = list(Idea.objects.filter(used_for_training=False)[:50])
    if len(ideas) < 10:
        logger.info("⏳ Meno di 10 nuove idee, salto il training.")
        return {"status": "skip", "message": "Meno di 10 idee disponibili per il training."}

    # Carica modello base o ultimo salvato
    base_path = os.path.join(os.getcwd(), "models")
    os.makedirs(base_path, exist_ok=True)

    latest_versions = sorted(
        [f for f in os.listdir(base_path) if f.startswith("mindlink-v")]
    )
    model_path = (
        os.path.join(base_path, latest_versions[-1])
        if latest_versions else "all-MiniLM-L6-v2"
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"⚙️ Caricamento modello da: {model_path} (device={device})")
    model = SentenceTransformer(model_path, device=device)

    # 🔹 Crea coppie (simili/dissimili)
    train_examples = []
    for idea in ideas:
        positives = [x for x in ideas if x.category == idea.category and x.id != idea.id]
        positive = random.choice(positives) if positives else random.choice(ideas)
        negative_candidates = [x for x in ideas if x.id not in (idea.id, positive.id)]
        negative = random.choice(negative_candidates) if negative_candidates else random.choice(ideas)

        train_examples.append(InputExample(texts=[idea.content, positive.content], label=1.0))
        train_examples.append(InputExample(texts=[idea.content, negative.content], label=0.0))

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=DEFAULTS["BATCH_SIZE"])
    train_loss = losses.CosineSimilarityLoss(model)

    logger.info(f"🎯 Avvio fine-tuning su {len(ideas)} idee...")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=DEFAULTS["EPOCHS"],
        show_progress_bar=True,
    )

    # 🔹 Salva nuova versione del modello con timestamp
    version = datetime.now().strftime("%Y%m%d-%H%M%S")
    new_path = os.path.join(base_path, f"mindlink-v{version}")
    model.save(new_path)
    logger.info(f"✅ Nuovo modello salvato in {new_path}")

    # 🔹 Marca le idee come usate
    Idea.objects.filter(id__in=[i.id for i in ideas]).update(used_for_training=True)
    logger.info(f"📘 Marcate {len(ideas)} idee come addestrate.")

    # 🔹 Aggiorna connessioni semantiche
    update_semantic_connections(model)
    logger.info("⚖️ Connessioni semantiche aggiornate con pesatura automatica.")

    return {"status": "ok", "message": f"Nuovo modello salvato in {new_path}"}


# =====================================================
# 🔹 RICALCOLO DELLE CONNESSIONI SEMANTICHE
# =====================================================

def update_semantic_connections(model=None, top_k=None, strong_thr=None, weak_thr=None):
    top_k = top_k or DEFAULTS["TOP_K"]
    strong_thr = strong_thr or DEFAULTS["STRONG_THR"]
    weak_thr = weak_thr or DEFAULTS["WEAK_THR"]

    ideas = list(Idea.objects.exclude(embedding=None))
    if len(ideas) < 2:
        logger.info("ℹ️ Troppe poche idee per aggiornare connessioni.")
        return

    # === Embedding Matrix ===
    embeddings = np.array([np.array(i.embedding, dtype=float) for i in ideas])
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = np.divide(embeddings, norms, out=np.zeros_like(embeddings), where=norms != 0)

    # === Similarity Matrix ===
    sim_matrix = np.dot(embeddings, embeddings.T)
    np.fill_diagonal(sim_matrix, 0.0)

    new_connections = 0
    updated_connections = 0
    total_strong = 0
    total_weak = 0
    new_pairs = set()

    for i, source in enumerate(ideas):
        top_indices = np.argsort(sim_matrix[i])[::-1][:top_k]
        for j in top_indices:
            sim = float(sim_matrix[i, j])
            if sim < weak_thr:
                continue

            target = ideas[j]
            ctype = "semantic_strong" if sim >= strong_thr else "semantic_weak"
            new_pairs.add((source.id, target.id))

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

    # === Pulizia connessioni obsolete ===
    existing_pairs = set(
        Connection.objects.filter(type__startswith="semantic")
        .values_list("source_id", "target_id")
    )
    obsolete_pairs = existing_pairs - new_pairs
    if obsolete_pairs:
        Connection.objects.filter(
            source_id__in=[s for s, _ in obsolete_pairs],
            target_id__in=[t for _, t in obsolete_pairs],
            type__startswith="semantic"
        ).delete()
        logger.info(f"🧹 Rimosse {len(obsolete_pairs)} connessioni obsolete.")

    # === Metriche di qualità ===
    valid_sims = sim_matrix[sim_matrix > 0]
    avg_sim = np.mean(valid_sims) if valid_sims.size else 0.0
    std_sim = np.std(valid_sims) if valid_sims.size else 0.0

    logger.info(
        f"🔗 Connessioni aggiornate: {new_connections} nuove, {updated_connections} modificate "
        f"(Strong={total_strong}, Weak={total_weak})"
    )
    logger.info(f"📊 Similarità media={avg_sim:.4f}, std={std_sim:.4f}")

    print(f"✅ Connessioni semantiche aggiornate ({new_connections} nuove, {updated_connections} aggiornate)")
    print(f"   Strong={total_strong}, Weak={total_weak}, AvgSim={avg_sim:.3f}")

    return {
        "new": new_connections,
        "updated": updated_connections,
        "strong": total_strong,
        "weak": total_weak,
        "avg_similarity": round(avg_sim, 4),
        "std_similarity": round(std_sim, 4),
    }


# =====================================================
# 🔹 TRIGGER MANUALE DAL PANNELLO ADMIN
# =====================================================

def force_training_now():
    """Avvia il training manuale istantaneo (richiamato dall'admin)."""
    try:
        start_time = datetime.now()
        logger.info(f"⚙️ [Admin Trigger] Training manuale avviato alle {start_time.isoformat()}")
        result = fine_tune_model()
        result["started_at"] = start_time.isoformat()
        result["finished_at"] = datetime.now().isoformat()
        return result
    except Exception as e:
        logger.exception("Errore durante il training manuale")
        return {"status": "error", "message": str(e)}
