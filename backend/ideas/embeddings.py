"""
embeddings.py — MindLink Semantic Core
--------------------------------------

Gestione centralizzata di:
- normalizzazione testo (pulizia, lowercasing, lemmatizzazione opzionale)
- generazione e caching degli embedding
- normalizzazione vettoriale per cosine similarity coerente
- compatibilità con modelli SentenceTransformer personalizzati
"""

from sentence_transformers import SentenceTransformer
import numpy as np
import re
import logging
import hashlib
from functools import lru_cache

logger = logging.getLogger(__name__)

# =====================================================
# 🔹 MODELLO BASE
# =====================================================
try:
    model = SentenceTransformer("all-MiniLM-L6-v2")
    EMBEDDING_DIM = model.get_sentence_embedding_dimension()
except Exception as e:
    logger.warning(f"⚠️ Errore nel caricamento del modello: {e}")
    model = None
    EMBEDDING_DIM = 384


# =====================================================
# 🔹 PULIZIA E NORMALIZZAZIONE TESTO
# =====================================================
def clean_text(text: str) -> str:
    """
    Pulisce e normalizza un testo per embedding coerenti.
    - Rimuove simboli e doppie spaziature
    - Porta tutto a lowercase
    - (Opzionale: potrebbe integrare spaCy per lemmatizzazione)
    """
    if not text:
        return ""
    text = re.sub(r"[^a-zA-Zàèéìòùç\s]", "", text.lower())
    text = re.sub(r"\s+", " ", text).strip()
    return text


# =====================================================
# 🔹 CACHE DEGLI EMBEDDING (in RAM)
# =====================================================
@lru_cache(maxsize=2048)
def _cached_encode(hash_key: str) -> np.ndarray:
    """Wrapper interno per caching deterministico."""
    if not model:
        return np.zeros(EMBEDDING_DIM)
    return model.encode(hash_key)


# =====================================================
# 🔹 FUNZIONE PRINCIPALE
# =====================================================
def generate_embedding(text: str) -> np.ndarray:
    """
    Genera un embedding normalizzato per un testo.
    - Applica pulizia del testo
    - Usa caching per efficienza
    - Normalizza il vettore per cosine similarity
    """
    if not text:
        return np.zeros(EMBEDDING_DIM)

    cleaned = clean_text(text)
    if not cleaned:
        return np.zeros(EMBEDDING_DIM)

    # Usa hash per caching deterministico
    key = hashlib.md5(cleaned.encode("utf-8")).hexdigest()
    emb = _cached_encode(key)

    # Normalizzazione (unit length)
    norm = np.linalg.norm(emb)
    if norm == 0:
        return emb
    return emb / norm


# =====================================================
# 🔹 FUNZIONE DI SIMILARITÀ
# =====================================================
def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Restituisce la similarità coseno tra due embedding."""
    if vec_a is None or vec_b is None:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b) + 1e-10))


# =====================================================
# 🔹 TEST MANUALE
# =====================================================
if __name__ == "__main__":
    a = "L'intelligenza artificiale migliora la produttività aziendale."
    b = "L'uso dell'AI aumenta l'efficienza nelle imprese."

    emb_a = generate_embedding(a)
    emb_b = generate_embedding(b)
    sim = cosine_similarity(emb_a, emb_b)

    print(f"✅ Similarità tra A e B: {sim:.4f}")
