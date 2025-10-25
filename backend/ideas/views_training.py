import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from .semantic_trainer import force_training_now

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def start_training(request):
    """
    🔹 Endpoint API per avviare manualmente il training incrementale.
    Solo gli utenti admin possono eseguirlo.
    """
    username = getattr(request.user, "username", "unknown")
    logger.info(f"🧠 Training istantaneo richiesto da admin: {username}")

    result = force_training_now()

    # Logging dettagliato
    if result.get("status") == "ok":
        logger.info(f"✅ Training completato con successo da {username}")
        return Response(result, status=status.HTTP_200_OK)
    elif result.get("status") == "skip":
        logger.warning(f"⚠️ Training saltato: {result.get('message')}")
        return Response(result, status=status.HTTP_202_ACCEPTED)
    else:
        logger.error(f"❌ Errore durante il training: {result.get('message')}")
        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
