import copy
import os

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from ideas.models import UserSettings
from ideas.serializers import UserSettingsSerializer


@api_view(["GET", "PUT"])
@permission_classes([permissions.IsAuthenticated])
def user_settings(request):
    """
    🔹 GET → restituisce le impostazioni utente
    🔹 PUT → aggiorna le impostazioni (anche parzialmente)
    """
    settings, _ = UserSettings.objects.get_or_create(user=request.user)

    if request.method == "GET":
        serializer = UserSettingsSerializer(settings)
        return Response({
            "preferences": serializer.data["preferences"],
            "updated_at": settings.updated_at
        }, status=status.HTTP_200_OK)

    # ✅ PUT: merge intelligente (evita di sovrascrivere tutto)
    elif request.method == "PUT":
        data = request.data.get("preferences", {})
        prefs = copy.deepcopy(settings.preferences)

        # Merge profondo dei dizionari
        def deep_update(d, u):
            for k, v in u.items():
                if isinstance(v, dict):
                    d[k] = deep_update(d.get(k, {}), v)
                else:
                    d[k] = v
            return d

        updated_prefs = deep_update(prefs, data)
        settings.preferences = updated_prefs
        settings.updated_at = timezone.now()
        settings.save()

        return Response({
            "preferences": settings.preferences,
            "updated_at": settings.updated_at
        }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def user_avatar(request):
    """
    🔹 Aggiorna o sostituisce l'avatar utente.
    Accetta un file sotto il campo 'avatar'.
    """
    file = request.FILES.get("avatar")

    if not file:
        return Response({"error": "Nessun file ricevuto"}, status=status.HTTP_400_BAD_REQUEST)

    # Cartella: MEDIA_ROOT/avatars/
    avatar_dir = os.path.join(settings.MEDIA_ROOT, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    filename = f"{request.user.username}_avatar.{file.name.split('.')[-1]}"
    path = os.path.join("avatars", filename).replace("\\", "/")

    full_path = os.path.join(settings.MEDIA_ROOT, path)

    # Rimuove l’avatar precedente se esiste
    if os.path.exists(full_path):
        os.remove(full_path)

    # Salva il nuovo file
    with open(full_path, "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    # Aggiorna il campo nelle preferenze utente (se lo usi)
    settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)
    prefs = settings_obj.preferences or {}
    prefs.setdefault("profile", {})["avatar_url"] = f"{settings.MEDIA_URL}{path}"
    settings_obj.preferences = prefs
    settings_obj.save()

    avatar_full_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{path}")
    return Response({"avatar_url": avatar_full_url}, status=status.HTTP_200_OK)
