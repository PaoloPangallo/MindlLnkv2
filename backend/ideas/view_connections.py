from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Connection, Idea
from .serializers import ConnectionSerializer

class ConnectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet per gestire connessioni manuali e semantiche.
    """
    queryset = Connection.objects.all().select_related("source", "target")
    serializer_class = ConnectionSerializer

    @action(detail=False, methods=["post"])
    def connect(self, request):
        """
        Crea una connessione manuale tra due idee (POST /api/connect/)
        """
        source_id = request.data.get("source_id")
        target_id = request.data.get("target_id")
        strength = float(request.data.get("strength", 0.5))
        ctype = request.data.get("type", "manual")

        if not source_id or not target_id:
            return Response({"error": "source_id and target_id required"}, status=400)

        if source_id == target_id:
            return Response({"error": "Cannot connect an idea to itself."}, status=400)

        try:
            source = Idea.objects.get(id=source_id)
            target = Idea.objects.get(id=target_id)
        except Idea.DoesNotExist:
            return Response({"error": "One or both ideas not found."}, status=404)

        connection, created = Connection.objects.get_or_create(
            source=source,
            target=target,
            type=ctype,
            defaults={"strength": strength}
        )

        if not created:
            connection.strength = strength
            connection.save()
            message = "Updated existing connection."
        else:
            message = "Created new connection."

        serializer = self.get_serializer(connection)
        return Response({"message": message, "connection": serializer.data})


@action(detail=False, methods=["post"])
def auto_weight(self, request):
    """
    Calcola e aggiorna automaticamente i pesi (strength) e i tipi ("semantic_strong"/"semantic_weak")
    delle connessioni tra idee in base alla similarità semantica.
    """
    from .embeddings import generate_embedding
    from .similarity import find_similar_ideas

    ideas = list(Idea.objects.all())
    if len(ideas) < 2:
        return Response({"error": "Servono almeno due idee per calcolare connessioni."}, status=400)

    # Calcola embedding per tutte le idee
    embeddings = [generate_embedding(i.content) for i in ideas]
    new_connections = 0
    updated_connections = 0

    for i, source in enumerate(ideas):
        idx, sims = find_similar_ideas(embeddings[i], embeddings)
        for k, target_idx in enumerate(idx):
            if source.id == ideas[target_idx].id:
                continue  # evita self-loop

            sim = float(sims[k])
            if sim < 0.6:
                continue  # ignora connessioni debolissime

            ctype = "semantic_strong" if sim >= 0.85 else "semantic_weak"

            conn, created = Connection.objects.update_or_create(
                source=source,
                target=ideas[target_idx],
                defaults={"strength": sim, "type": ctype},
            )

            if created:
                new_connections += 1
            else:
                updated_connections += 1

    return Response({
        "message": "✅ Connessioni semantiche aggiornate",
        "new": new_connections,
        "updated": updated_connections
    })

