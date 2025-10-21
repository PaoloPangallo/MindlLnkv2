"""
similarity.py — Funzioni per la ricerca di idee semanticamente simili
--------------------------------------------------------------------
Usato da IdeaViewSet.similar e dal trainer per suggerire o connettere idee affini.
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


def find_similar_ideas(target_embedding, all_embeddings, top_k: int = 5, min_threshold: float = 0.5):
    """
    Trova le idee più simili basandosi sulla cosine similarity.

    Args:
        target_embedding (array-like): embedding dell'idea di riferimento.
        all_embeddings (array-like): lista o matrice NxD di embedding da confrontare.
        top_k (int): numero massimo di risultati da restituire.
        min_threshold (float): soglia minima di similarità da considerare.

    Returns:
        (indices, similarities): tuple di liste ordinate per similarità decrescente.
    """
    if target_embedding is None or len(all_embeddings) == 0:
        logger.warning("⚠️ find_similar_ideas: nessun embedding disponibile.")
        return [], []

    # Converti in numpy array e normalizza
    target_embedding = np.asarray(target_embedding, dtype=float).reshape(1, -1)
    all_embeddings = np.asarray(all_embeddings, dtype=float)

    # Normalizzazione vettoriale (unit norm)
    def normalize(vectors):
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        return np.divide(vectors, norms, out=np.zeros_like(vectors), where=norms != 0)

    target_norm = normalize(target_embedding)
    all_norm = normalize(all_embeddings)

    # Calcola cosine similarity
    similarities = cosine_similarity(target_norm, all_norm)[0]

    # Applica soglia minima
    valid_mask = similarities >= min_threshold
    if not np.any(valid_mask):
        logger.info("ℹ️ Nessuna idea simile trovata sopra la soglia.")
        return [], []

    # Ordina per similarità decrescente
    top_indices = np.argsort(similarities[valid_mask])[::-1][:top_k]
    valid_similarities = similarities[valid_mask][top_indices]

    # Converti in liste Python
    indices = np.arange(len(similarities))[valid_mask][top_indices].tolist()
    similarities = valid_similarities.tolist()

    logger.debug(f"🔎 Trovate {len(indices)} idee simili (max {top_k}).")
    return indices, similarities
