from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Q
from .models import Idea
from .serializers import IdeaSerializer
from .analyze import find_similar_ideas_by_text


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_ideas(request):
    """
    🔍 Ricerca un'idea per titolo, descrizione, categoria o parole chiave.
    Supporta sia ricerca testuale che semantica.
    """
    query = request.query_params.get("q", "").strip()
    mode = request.query_params.get("mode", "text")  # "text" | "semantic"

    if not query:
        return Response({"results": []}, status=200)

    # 🔹 Ricerca testuale
    if mode == "text":
        ideas = Idea.objects.filter(
            Q(title__icontains=query)
            | Q(content__icontains=query)
            | Q(category__icontains=query)
            | Q(summary__icontains=query)
        ).distinct()

        serializer = IdeaSerializer(ideas, many=True)
        return Response({"results": serializer.data})

    # 🔹 Ricerca semantica (embedding similarity)
    elif mode == "semantic":
        try:
            results = find_similar_ideas_by_text(query, top_k=5, min_threshold=0.5)
            return Response({"results": results})
        except Exception as e:
            return Response(
                {"error": f"Errore nella ricerca semantica: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response({"error": "mode non valido"}, status=400)
