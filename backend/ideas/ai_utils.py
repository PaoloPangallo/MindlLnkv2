# ideas/views_similar.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging

from .analyze import find_similar_ideas_by_text

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])  # ✅ solo utenti loggati
def similar_ideas(request):
    """
    🔹 Endpoint API per trovare idee semanticamente simili a un testo.
    Delega tutta la logica al core `analyze.py`, che:
      - genera l'embedding per il testo fornito
      - recupera gli embedding dal DB (senza ricalcolarli)
      - calcola la similarità coseno
      - restituisce i risultati formattati
    """
    text = request.data.get("text", "").strip()
    if not text:
        return Response({"error": "missing text"}, status=status.HTTP_400_BAD_REQUEST)

    top_k = int(request.data.get("top_k", 5))
    min_threshold = float(request.data.get("min_threshold", 0.5))
    user = getattr(request.user, "username", "anonymous")

    logger.info(f"🔎 [similar_ideas] User={user}, len(text)={len(text)}, top_k={top_k}, thr={min_threshold}")

    try:
        results = find_similar_ideas_by_text(text, top_k=top_k, min_threshold=min_threshold)

        if not results:
            return Response(
                {"message": "Nessuna idea simile trovata."},
                status=status.HTTP_204_NO_CONTENT
            )

        return Response({"results": results}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("❌ Errore nell'endpoint similar_ideas", exc_info=True)
        return Response(
            {"error": "Errore interno durante la ricerca di similarità."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
