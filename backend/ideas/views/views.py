# =====================================================
# 🔹 IMPORT PRINCIPALI
# =====================================================

import logging
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.db.models import Count
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


from ideas.analyze import (
    find_similar_ideas_by_text,
    summarize_text,
    classify_text,
    extract_keywords,
    generate_embedding,
    clear_model_cache,
    perform_full_analysis, find_similar_ideas,
)
from ideas.models import Idea
from ideas.serializers import IdeaSerializer, RegisterSerializer
from notifications.utils import notify_related_ideas

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

    @transaction.atomic
    def perform_create(self, serializer):
        """
        🔹 Associa automaticamente l'idea all'utente autenticato
        🔹 Genera notifiche per gli autori di idee simili
        """
        idea = serializer.save(user=self.request.user)
        logger.info(f"✨ Nuova idea creata: {idea.title} (user={self.request.user.username})")

        try:
            similar_ideas = find_similar_ideas(idea, top_k=3, min_threshold=0.7)
            if similar_ideas:
                count = notify_related_ideas(idea, similar_ideas)
                logger.info(f"📬 {count} notifiche generate per idee simili a '{idea.title}'")
            else:
                logger.info("Nessuna idea simile trovata per notifica.")
        except Exception as e:
            logger.error(f"❌ Errore generazione notifiche idea {idea.id}: {e}")

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
    # 🔹 IDEE PERSONALI DELL’UTENTE
    # =====================================================
    @action(detail=False, methods=['get'])
    def mine(self, request):
        ideas = Idea.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(ideas, many=True)
        return Response(serializer.data)

    # =====================================================
    # 🔹 IDEE CORRELATE
    # =====================================================
    @action(detail=True, methods=['get'])
    def related(self, request, pk=None):
        """
        🔹 Trova idee correlate combinando similarità semantica (embedding),
           parole chiave e categoria, con pesi personalizzati.
           Se l'idea non ha embedding, lo genera automaticamente.
        """

        try:
            idea = Idea.objects.get(pk=pk, user=request.user)
        except Idea.DoesNotExist:
            return Response({"error": "Idea non trovata o non tua."}, status=404)

        # 🧠 Genera automaticamente embedding se mancante o vuoto
        if not idea.embedding or len(idea.embedding) == 0:
            try:
                idea.embedding = generate_embedding(idea.content).tolist()
                idea.save(update_fields=["embedding"])
                logger.info(f"✅ Embedding generato automaticamente per idea {idea.id}")
            except Exception as e:
                logger.error(f"❌ Errore generazione embedding idea {idea.id}: {e}")
                return Response({"error": "Impossibile generare embedding per questa idea."}, status=500)

        # Embedding di riferimento
        emb_a = np.array(idea.embedding).reshape(1, -1)
        keywords_a = set(idea.keywords or [])
        category_a = idea.category or None

        # Recupera altre idee con embedding validi
        others = [
            other for other in Idea.objects.exclude(id=idea.id).exclude(embedding=None)
            if other.embedding and len(other.embedding) == len(idea.embedding)
        ]

        if not others:
            return Response({
                "idea_id": idea.id,
                "related": [],
                "meta": {"message": "Nessuna altra idea disponibile per confronto."}
            })

        # --- Pesi configurabili (default 0.6 / 0.3 / 0.1) ---
        try:
            w_cos = float(request.query_params.get("cosine", 0.6))
            w_kw = float(request.query_params.get("keywords", 0.3))
            w_cat = float(request.query_params.get("category", 0.1))
        except ValueError:
            w_cos, w_kw, w_cat = 0.6, 0.3, 0.1  # fallback sicuro

        sims = []
        for other in others:
            try:
                emb_b = np.array(other.embedding).reshape(1, -1)
                sim_cos = float(cosine_similarity(emb_a, emb_b)[0][0])

                # Overlap keywords
                kw_overlap = 0.0
                if idea.keywords and other.keywords:
                    common = keywords_a.intersection(set(other.keywords))
                    total = len(keywords_a.union(set(other.keywords)))
                    if total > 0:
                        kw_overlap = len(common) / total

                # Match di categoria
                cat_bonus = 1.0 if category_a and category_a == other.category else 0.0

                # --- Score combinato ---
                hybrid_score = w_cos * sim_cos + w_kw * kw_overlap + w_cat * cat_bonus

                if hybrid_score > 0.4:
                    sims.append({
                        "id": other.id,
                        "title": other.title,
                        "category": other.category,
                        "similarity": round(sim_cos, 3),
                        "keyword_overlap": round(kw_overlap, 3),
                        "category_match": bool(cat_bonus),
                        "hybrid_score": round(hybrid_score, 3),
                    })

            except Exception as e:
                logger.warning(f"⚠️ Errore calcolo similarità per idea {other.id}: {e}")
                continue

        sims = sorted(sims, key=lambda x: x["hybrid_score"], reverse=True)[:10]

        return Response({
            "idea_id": idea.id,
            "related": sims,
            "meta": {
                "weights": {"cosine": w_cos, "keywords": w_kw, "category": w_cat},
                "count": len(sims),
                "auto_generated_embedding": not idea.used_for_training,  # utile per debug
            },
        })

    # =====================================================
    # 🔹 INSIGHT STATISTICI
    # =====================================================
    @action(detail=False, methods=['get'])
    def insights(self, request):
        ideas = Idea.objects.filter(user=request.user)
        if not ideas.exists():
            return Response({"message": "Nessuna idea trovata."}, status=200)

        total = ideas.count()
        categories = ideas.values('category').annotate(count=Count('id')).order_by('-count')
        all_keywords = []
        for idea in ideas:
            if isinstance(idea.keywords, list):
                all_keywords.extend(idea.keywords)

        from collections import Counter
        keywords_top = [k for k, _ in Counter(all_keywords).most_common(8)]

        data = {
            "total_ideas": total,
            "categories": list(categories),
            "top_keywords": keywords_top,
        }
        return Response(data)

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
