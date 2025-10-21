from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .semantic_trainer import force_training_now

@api_view(['POST'])
@permission_classes([IsAdminUser])
def start_training(request):
    """
    Endpoint API per avviare manualmente il training istantaneo.
    """
    result = force_training_now()
    return Response(result)
