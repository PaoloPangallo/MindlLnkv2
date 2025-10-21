from .models import Idea
from .embeddings import generate_embedding
from .similarity import find_similar_ideas
from rest_framework.response import Response
from rest_framework.decorators import api_view
import numpy as np

@api_view(["POST"])
def similar_ideas(request):
    """Endpoint API per trovare idee simili al testo fornito."""
    text = request.data.get("text", "")
    if not text:
        return Response({"error": "missing text"}, status=400)

    target_emb = generate_embedding(text)
    ideas = list(Idea.objects.all())

    all_embs = [generate_embedding(i.content) for i in ideas]
    idx, sims = find_similar_ideas(target_emb, all_embs)

    results = [
        {"title": ideas[i].title, "similarity": float(sims[k])}
        for k, i in enumerate(idx)
    ]
    return Response({"results": results})
