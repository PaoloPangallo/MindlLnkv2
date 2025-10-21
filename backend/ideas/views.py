import numpy as np

from .models import Idea, Connection
from .embeddings import generate_embedding
from .serializers import IdeaSerializer, ConnectionSerializer
from .similarity import find_similar_ideas
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response


class IdeaViewSet(viewsets.ModelViewSet):
    queryset = Idea.objects.all().order_by('-created_at')
    serializer_class = IdeaSerializer
    permission_classes = [permissions.IsAuthenticated]  # ✅ Richiede login JWT

    def perform_create(self, serializer):
        """Associa automaticamente l'idea all'utente autenticato"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def similar(self, request):
        """Trova idee semanticamente simili al testo fornito."""
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "missing text"}, status=400)

        # 🔹 1. Embedding del testo target
        target_emb = generate_embedding(text)

        # 🔹 2. Recupera solo idee con embedding già calcolato
        ideas = list(Idea.objects.exclude(embedding=None))
        if not ideas:
            return Response({"error": "no ideas with embeddings available"}, status=404)

        all_embs = [np.array(i.embedding, dtype=float) for i in ideas]

        # 🔹 3. Calcola similarità
        idx, sims = find_similar_ideas(target_emb, all_embs, top_k=5, min_threshold=0.5)

        if not idx:
            return Response({"results": []})  # Nessuna idea sopra soglia

        # 🔹 4. Prepara risultati ordinati
        results = [
            {
                "id": ideas[i].id,
                "title": ideas[i].title,
                "summary": ideas[i].summary,
                "category": ideas[i].category,
                "similarity": round(float(sims[k]), 3),
            }
            for k, i in enumerate(idx)
        ]
        return Response({"results": results})


class ConnectionViewSet(viewsets.ModelViewSet):
    queryset = Connection.objects.all()
    serializer_class = ConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
