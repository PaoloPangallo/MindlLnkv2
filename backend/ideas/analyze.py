# analyze.py
# ---------------------------------------
# 🧠 MindLink AI Core
# ---------------------------------------
# Unica fonte di verità per:
# - Caricamento modello (gestisce versioni fine-tuned)
# - Pulizia testo
# - Funzioni di analisi (summary, category, keywords)
# - Funzioni di embedding (generate_embedding, similarity)

import glob
import logging
import re
import numpy as np
from functools import lru_cache

import torch
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from .models import Idea, Connection  # Import necessario per il type hint

logger = logging.getLogger(__name__)

# =====================================================
# 🔹 STOPWORDS
# =====================================================
ITALIAN_STOPWORDS = [
    "a", "ad", "al", "allo", "ai", "agli", "alla", "alle", "con", "col", "coi", "da", "dal",
    "dallo", "dai", "dagli", "dalla", "dalle", "di", "del", "dello", "dei", "degli",
    "della", "delle", "in", "nel", "nello", "nei", "negli", "nella", "nelle", "su", "sul",
    "sullo", "sui", "sugli", "sulla", "sulle", "per", "tra", "fra", "il", "lo", "la", "i",
    "gli", "le", "un", "uno", "una", "ma", "o", "e", "anche", "come", "dove", "quando",
    "che", "chi", "cui", "non", "più", "meno", "mi", "ti", "si", "ci", "vi", "ne", "ho",
    "hai", "ha", "abbiamo", "avete", "hanno", "sono", "sei", "era", "erano", "fui", "fu",
    "fummo", "foste", "furono", "questo", "quello", "quella", "queste", "questi",
    "quelli", "quelle"
]

# =====================================================
# 🔹 MODELLO SINGLETON (Logica da signals.py)
# =====================================================
_model = None
EMBEDDING_DIM = 384  # Default, verrà sovrascritto


def get_latest_model_path() -> str:
    paths = sorted(glob.glob("models/mindlink-v*"))
    return paths[-1] if paths else "all-MiniLM-L6-v2"


def get_model() -> SentenceTransformer:
    global _model, EMBEDDING_DIM
    if _model is None:
        path = get_latest_model_path()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            _model = SentenceTransformer(path, device=device)
            EMBEDDING_DIM = _model.get_sentence_embedding_dimension()
            logger.info(f"✅ Modello AI caricato: {path} (device={device}, {EMBEDDING_DIM} dim)")
        except Exception as e:
            logger.error(f"⚠️ Errore caricamento modello {path}: {e}. Fallback su base.")
            _model = SentenceTransformer("all-MiniLM-L6-v2", device=device)
            EMBEDDING_DIM = _model.get_sentence_embedding_dimension()
    return _model


def clear_model_cache():
    global _model
    _model = None
    logger.info("🧹 Cache del modello AI invalidata. Verrà ricaricato al prossimo uso.")


# =====================================================
# 🔹 FUNZIONI DI BASE (clean, embed, similarity)
# =====================================================
def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[^a-zA-Zàèéìòùç\s]", "", text.lower())
    return re.sub(r"\s+", " ", text).strip()


@lru_cache(maxsize=2048)
def _cached_encode(cleaned_text: str) -> np.ndarray:
    model = get_model()
    if not cleaned_text:
        return np.zeros(EMBEDDING_DIM)
    return model.encode(cleaned_text)


def generate_embedding(text: str) -> np.ndarray:
    cleaned = clean_text(text)
    if not cleaned:
        return np.zeros(EMBEDDING_DIM)
    emb = _cached_encode(cleaned)
    norm = np.linalg.norm(emb)
    return emb / norm if norm != 0 else emb


def cosine_similarity(vec_a, vec_b):
    if vec_a is None or vec_b is None:
        return 0.0
    denom = (np.linalg.norm(vec_a) * np.linalg.norm(vec_b)) + 1e-10
    return float(np.dot(vec_a, vec_b) / denom)


# =====================================================
# 🔹 ANALISI (summary, category, keywords)
# =====================================================
def extract_keywords(text, top_k=5):
    cleaned = clean_text(text)
    if not cleaned:
        return []
    try:
        vectorizer = TfidfVectorizer(stop_words=ITALIAN_STOPWORDS, max_features=50)
        tfidf = vectorizer.fit_transform([cleaned])
        scores = zip(vectorizer.get_feature_names_out(), tfidf.toarray()[0])
        return [kw for kw, _ in sorted(scores, key=lambda x: x[1], reverse=True)[:top_k]]
    except Exception as e:
        logger.warning(f"⚠️ Errore in extract_keywords: {e}")
        return []


def summarize_text(text: str) -> str:
    model = get_model()
    cleaned = clean_text(text)
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.split()) > 4]
    if not sentences:
        return cleaned[:150]

    embeddings = model.encode(sentences)
    centroid = np.mean(embeddings, axis=0)
    norms = np.linalg.norm(embeddings, axis=1)
    norm_centroid = np.linalg.norm(centroid)
    if norm_centroid == 0 or np.any(norms == 0):
        return sentences[0].strip()
    similarities = np.dot(embeddings, centroid) / (norms * norm_centroid)
    return sentences[np.argmax(similarities)].strip()


def classify_text(text: str) -> str:
    model = get_model()
    cleaned = clean_text(text)
    if not cleaned:
        return "generale"

    topics = ["tecnologia", "educazione", "ambiente", "salute", "economia", "arte", "società"]
    topic_embeddings = model.encode(topics)
    emb = model.encode([cleaned])
    sims = np.dot(emb, topic_embeddings.T)[0]
    return topics[int(np.argmax(sims))]


# =====================================================
# 🔹 FUNZIONE COMPLETA (per i signals)
# =====================================================
def perform_full_analysis(instance: Idea):
    try:
        text = instance.content or ""
        summary = summarize_text(text)
        category = classify_text(text)
        keywords = extract_keywords(text)
        embedding = generate_embedding(text)
        if embedding is None or not np.any(embedding):
            embedding = np.zeros(EMBEDDING_DIM)

        Idea.objects.filter(id=instance.id).update(
            summary=summary,
            category=category,
            keywords=keywords,
            embedding=embedding.tolist(),
        )
        logger.info(f"🧠 Analisi completata per Idea #{instance.id}")
    except Exception as e:
        logger.exception(f"Errore durante analisi Idea #{instance.id}: {e}")


def _find_similar_vectors(
        target_emb: np.ndarray,
        all_embs: np.ndarray,
        top_k: int = 5,
        min_threshold: float = 0.5
) -> tuple[list, list]:
    """
    Funzione helper per calcolare la similarità (dot product)
    Assumendo che tutti i vettori siano normalizzati (come fa generate_embedding).
    """
    # Il prodotto scalare È la cosine similarity per vettori normalizzati
    sims = np.dot(all_embs, target_emb)

    # Ordina e filtra
    top_indices = np.argpartition(sims, -top_k)[-top_k:]
    sorted_indices = top_indices[np.argsort(sims[top_indices])[::-1]]

    final_indices = []
    final_sims = []
    for i in sorted_indices:
        if sims[i] >= min_threshold:
            final_indices.append(i)
            final_sims.append(sims[i])
        else:
            break  # Abbiamo superato la soglia

        if len(final_indices) >= top_k:
            break  # Abbiamo raggiunto il top_k

    return final_indices, final_sims


def find_similar_ideas_by_text(
        text: str,
        top_k: int = 5,
        min_threshold: float = 0.5
) -> list[dict]:
    """
    Funzione di alto livello per trovare idee simili a un testo.
    Gestisce generazione embedding, fetch dal DB, calcolo e formattazione.
    """
    logger.info(f"Avvio ricerca di similarità per: '{text[:30]}...'")

    # 1. Embedding del testo target (usa la nostra funzione centralizzata)
    target_emb = generate_embedding(text)

    # 2. Recupera idee con embedding
    # ⚠️ ATTENZIONE: Carica tutto in memoria. Non scala!
    # Questo è il collo di bottiglia. Va bene per < 5-10k idee,
    # dopodiché sarà necessario un database vettoriale (es. pgvector, Pinecone).
    try:
        ideas_with_embs = list(Idea.objects
                               .exclude(embedding=None)
                               .only("id", "title", "summary", "category", "embedding"))
    except Exception as e:
        logger.error(f"Errore DB nel fetch idee per similarità: {e}")
        return []

    if not ideas_with_embs:
        logger.warning("Nessuna idea con embedding trovata nel DB.")
        return []

    # 3. Prepara i vettori per il calcolo
    all_embs = np.array(
        [np.array(i.embedding, dtype=float) for i in ideas_with_embs],
        dtype=float
    )

    # 4. Calcola similarità (usando la funzione helper)
    idx, sims = _find_similar_vectors(target_emb, all_embs, top_k, min_threshold)

    if not idx:
        return []  # Nessun risultato sopra la soglia

    # 5. Prepara risultati formattati
    results = [
        {
            "id": ideas_with_embs[i].id,
            "title": ideas_with_embs[i].title,
            "summary": ideas_with_embs[i].summary,
            "category": ideas_with_embs[i].category,
            "similarity": round(float(sims[k]), 3),
        }
        for k, i in enumerate(idx)
    ]
    return results


def recalculate_semantic_connections(
        min_threshold: float = 0.6,
        strong_threshold: float = 0.85,
        top_k: int = 20
) -> dict:
    """
    Ricalcola *tutte* le connessioni semantiche (all-vs-all)
    usando gli embedding PRE-CALCOLATI nel DB.

    Questo è efficiente sull'embedding, ma computazionalmente O(N^2).
    Va eseguito come un'operazione batch, non troppo di frequente.
    """
    logger.info("Inizio ricalcolo connessioni semantiche (all-vs-all)...")

    # 1. Recupera tutte le idee che hanno un embedding
    try:
        ideas = list(Idea.objects
                     .exclude(embedding=None)
                     .only("id", "embedding"))
    except Exception as e:
        logger.error(f"Errore DB nel fetch idee per connessioni: {e}")
        return {"error": "Errore Database"}

    if len(ideas) < 2:
        return {"message": "Servono almeno due idee per calcolare connessioni.", "new": 0, "updated": 0}

    # 2. Prepara i dati per numpy
    all_embs = np.array(
        [np.array(i.embedding, dtype=float) for i in ideas],
        dtype=float
    )
    # Mappa per ritrovare l'oggetto Idea dall'indice numpy
    idea_map = {i: idea for i, idea in enumerate(ideas)}

    new_connections = 0
    updated_connections = 0

    # 3. Calcola similarità (N*N)
    for i, source_idea in enumerate(ideas):
        target_emb = all_embs[i]

        # 4. Trova i K vicini più prossimi per questa idea
        # Usiamo la nostra funzione helper interna
        idx, sims = _find_similar_vectors(
            target_emb,
            all_embs,
            top_k=top_k,
            min_threshold=min_threshold
        )

        for k, target_idx in enumerate(idx):
            # 5. Filtra self-loop
            if i == target_idx:
                continue

            target_idea = idea_map[target_idx]
            sim = float(sims[k])

            # Definisci il tipo di connessione
            ctype = "semantic_strong" if sim >= strong_threshold else "semantic_weak"

            # 6. Aggiorna o crea la connessione nel DB
            try:
                conn, created = Connection.objects.update_or_create(
                    source=source_idea,
                    target=target_idea,
                    defaults={"strength": sim, "type": ctype},
                )
                if not conn.type.startswith("semantic"):
                    continue  # evita di toccare connessioni manuali

                if created:
                    new_connections += 1
                else:
                    updated_connections += 1

            except Exception as e:
                logger.warning(f"Errore update_or_create tra {source_idea.id} e {target_idea.id}: {e}")

    logger.info(f"Ricalcolo connessioni completato. Nuove: {new_connections}, Aggiornate: {updated_connections}")
    return {
        "message": "✅ Connessioni semantiche aggiornate",
        "new": new_connections,
        "updated": updated_connections,
        "total_ideas_processed": len(ideas)
    }
