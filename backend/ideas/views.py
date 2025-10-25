# views.py (COMPLETO E CORRETTO)

import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, action  # <-- Aggiunto api_view
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

# Importa le funzioni dal core 'analyze.py'
from .analyze import (
    find_similar_ideas_by_text,
    summarize_text,
    classify_text,
    extract_keywords,
    generate_embedding,
    clear_model_cache,
    perform_full_analysis
)
from .models import Idea
from .serializers import IdeaSerializer

logger = logging.getLogger(__name__)


# =====================================================
# 🔹 VIEWSET PER LE IDEE
# =====================================================



class SimilarIdeaThrottle(UserRateThrottle):
    rate = "5/min"

class IdeaViewSet(viewsets.ModelViewSet):
    throttle_classes = [SimilarIdeaThrottle]
    queryset = Idea.objects.all().order_by('-created_at')
    serializer_class = IdeaSerializer
    permission_classes = [permissions.IsAuthenticated]  # ✅

    def perform_create(self, serializer):
        """Associa automaticamente l'idea all'utente autenticato"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def similar(self, request):
        logger.exception("Errore in 'similar' endpoint", exc_info=True)

        """Trova idee semanticamente simili al testo fornito."""
        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"error": "missing text"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            results = find_similar_ideas_by_text(
                text,
                top_k=5,
                min_threshold=0.5
            )
            return Response({"results": results})

        except Exception as e:
            logger.error(f"Errore imprevisto in endpoint 'similar': {e}")
            return Response(
                {"error": "Internal server error during similarity search."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )




# =====================================================
# 🔹 ENDPOINT API AGGIUNTIVI (MANCANTI)
# =====================================================

@api_view(["POST"])
def analyze_idea_endpoint(request):
    """
    Analizza un'idea (da ID o testo) e ne restituisce i risultati.
    Aggiorna il DB *solo* se viene passato un ID.
    (Questo era 'analyze_idea' nel tuo file originale)
    """
    idea_id = request.data.get("id")
    text = request.data.get("text")
    idea_instance = None

    if idea_id:
        try:
            idea_instance = Idea.objects.get(id=idea_id)
            text = idea_instance.content
        except Idea.DoesNotExist:
            return Response({"error": "idea not found"}, status=404)

    if not text:
        return Response({"error": "missing text or idea id"}, status=400)

    # Esegui l'analisi usando le funzioni centralizzate
    summary = summarize_text(text)
    category = classify_text(text)
    keywords = extract_keywords(text)

    if idea_instance:
        idea_instance.summary = summary
        idea_instance.category = category
        idea_instance.keywords = keywords
        embedding = generate_embedding(text).tolist()
        idea_instance.embedding = embedding

        idea_instance.save(update_fields=["summary", "category", "keywords", "embedding"])
        message = f"Idea {idea_id} analizzata e aggiornata."
    else:
        message = "Analisi completata (test standalone, nessun salvataggio)."

    return Response({
        "message": message,
        "summary": summary,
        "category": category,
        "keywords": keywords
    })


@api_view(["POST"])
def refresh_all_analysis_endpoint(request):
    """
    Rianalizza *tutte* le idee nel database con l'ultimo modello.
    (Questo era 'refresh_analysis' nel tuo file originale)
    """

    # 1. Invalida la cache per caricare il modello più recente
    clear_model_cache()

    ideas = Idea.objects.all()
    if not ideas.exists():
        return Response({"message": "Nessuna idea trovata nel database."}, status=404)

    updated = 0
    for idea in ideas:
        # 2. Usa la funzione completa che aggiorna il DB in modo sicuro
        perform_full_analysis(idea)
        updated += 1

    return Response({
        "message": f"Analisi completata. Aggiornate {updated} idee con l'ultimo modello.",
        "total_updated": updated
    })
