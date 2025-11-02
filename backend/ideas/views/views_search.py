# ideas/views/views_search.py
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions
from ideas.models import Idea


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_ideas(request):
    query = request.query_params.get("q", "").strip()
    if not query:
        return Response({"results": []})

    # 🔹 Costruisce la query full-text
    search_query = SearchQuery(query)

    # 🔹 Usa il vettore indicizzato con ranking
    ideas = (
        Idea.objects
        .annotate(rank=SearchRank(SearchVector("title", weight="A") + SearchVector("content", weight="B"), search_query))
        .filter(rank__gte=0.1)
        .order_by("-rank")[:20]
        .values("id", "title", "summary", "category")
    )

    return Response({"results": list(ideas)})
