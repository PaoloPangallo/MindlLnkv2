# =====================================================
# 🔹 IMPORT PRINCIPALI
# =====================================================

import logging
from datetime import timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .analyze import (
    find_similar_ideas_by_text,
    summarize_text,
    classify_text,
    extract_keywords,
    generate_embedding,
    clear_model_cache,
    perform_full_analysis,
)
from .models import Idea
from .serializers import IdeaSerializer, RegisterSerializer

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
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """Associa automaticamente l'idea all'utente autenticato"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def similar(self, request):
        """Trova idee semanticamente simili al testo fornito."""
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "missing text"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            results = find_similar_ideas_by_text(text, top_k=5, min_threshold=0.5)
            return Response({"results": results})
        except Exception as e:
            logger.error(f"Errore imprevisto in endpoint 'similar': {e}")
            return Response(
                {"error": "Internal server error during similarity search."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =====================================================
# 🔹 ENDPOINT API AGGIUNTIVI
# =====================================================

@api_view(["POST"])
def analyze_idea_endpoint(request):
    """Analizza un'idea (da ID o testo) e aggiorna il DB se serve."""
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

    summary = summarize_text(text)
    category = classify_text(text)
    keywords = extract_keywords(text)

    if idea_instance:
        idea_instance.summary = summary
        idea_instance.category = category
        idea_instance.keywords = keywords
        idea_instance.embedding = generate_embedding(text).tolist()
        idea_instance.save(update_fields=["summary", "category", "keywords", "embedding"])
        message = f"Idea {idea_id} analizzata e aggiornata."
    else:
        message = "Analisi completata (test standalone, nessun salvataggio)."

    return Response({
        "message": message,
        "summary": summary,
        "category": category,
        "keywords": keywords,
    })


@api_view(["POST"])
def refresh_all_analysis_endpoint(request):
    """Rianalizza *tutte* le idee con il modello più recente."""
    clear_model_cache()

    ideas = Idea.objects.all()
    if not ideas.exists():
        return Response({"message": "Nessuna idea trovata nel database."}, status=404)

    updated = 0
    for idea in ideas:
        perform_full_analysis(idea)
        updated += 1

    return Response({
        "message": f"Analisi completata. Aggiornate {updated} idee.",
        "total_updated": updated,
    })


# =====================================================
# 🔹 AUTENTICAZIONE (LOGIN / REGISTER / REFRESH)
# =====================================================

class RegisterView(generics.CreateAPIView):
    """Crea un nuovo utente e restituisce i token JWT."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "username and password required"}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({"error": "username already exists"}, status=400)

        user = User.objects.create_user(username=username, password=password)
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "user created",
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {"id": user.id, "username": user.username},
        }, status=201)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """Login utente e restituzione token JWT."""
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "invalid credentials"}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": {"id": user.id, "username": user.username},
    })


# ✅ Endpoint refresh token compatibile con il frontend Angular
class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
