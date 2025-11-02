from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import Notification
from .serializer import NotificationSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_notifications(request):
    qs = Notification.objects.filter(user=request.user).order_by("-created_at")
    serializer = NotificationSerializer(qs, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_as_read(request, pk):
    try:
        notif = Notification.objects.get(pk=pk, user=request.user)
        notif.is_read = True
        notif.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
