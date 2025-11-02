# view_connections.py (Rifattorizzato)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ideas.models import Connection, Idea
from ideas.serializers import ConnectionSerializer
import logging

# Importa la nuova funzione di alto livello dal core
from ideas.analyze import recalculate_semantic_connections
from notifications.utils import notify_new_connection

logger = logging.getLogger(__name__)


class ConnectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    """
    ViewSet per gestire connessioni manuali e semantiche.
    """
    queryset = Connection.objects.all().select_related("source", "target")
    serializer_class = ConnectionSerializer

    @action(detail=False, methods=["post"])
    def connect(self, request):
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

            # 🔔 Genera notifiche
            notify_new_connection(source, target, request.user)

        serializer = self.get_serializer(connection)
        return Response({"message": message, "connection": serializer.data})

    @action(detail=False, methods=["post"])
    def auto_weight(self, request):
        """
        [CORRETTO] Calcola e aggiorna *tutte* le connessioni semantiche
        usando gli embedding PRE-CALCOLATI dal database.
        """
        logger.info("Avvio ricalcolo connessioni semantiche...")
        try:
            # 1. Delega tutta la logica pesante al core
            # Definiamo soglie qui
            stats = recalculate_semantic_connections(
                min_threshold=0.6,  # Ignora connessioni sotto questa soglia
                strong_threshold=0.85  # Definisce una connessione "forte"
            )

            return Response(stats)

        except Exception as e:
            logger.error(f"Errore in auto_weight: {e}")
            return Response(
                {"error": "Errore interno durante il ricalcolo delle connessioni."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )