# ideas/admin_views.py
import os
from django.utils import timezone

from django.contrib.auth import get_user_model
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from .ai_utils import logger
from .models import Idea
from .permissions import IsAdminOrStaff
from .semantic_trainer import force_training_now


User = get_user_model()


# ============================================================
# 🔹 Avvia manualmente il training (solo admin/staff)
# ============================================================
@api_view(["POST"])
@permission_classes([IsAdminOrStaff])
def start_training(request):
    """
    Avvia il training manuale (solo per admin o staff).
    """

    user = request.user
    logger.info(
        f"🧠 Training avviato manualmente da {user.username} | "
        f"staff={user.is_staff}, superuser={user.is_superuser} | time={now()}"
    )

    try:
        result = force_training_now()
        if result.get("status") == "ok":
            logger.info(f"✅ Training completato con successo: {result.get('message')}")
            return Response(result, status=status.HTTP_200_OK)
        elif result.get("status") == "skip":
            logger.warning(f"⚠️ Training saltato: {result.get('message')}")
            return Response(result, status=status.HTTP_202_ACCEPTED)
        else:
            logger.error(f"❌ Errore nel training: {result}")
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.exception(f"💥 Errore inatteso durante il training: {e}")
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# 🔹 Lista utenti con statistiche base
# ============================================================
@api_view(["GET"])
@permission_classes([IsAdminOrStaff])
def list_users(request):
    """
    Restituisce la lista utenti con:
    - conteggio idee pubblicate
    - stato attivo
    - ruolo admin/staff
    """
    logger.info(f"👥 Lista utenti richiesta da {request.user.username}")

    users = User.objects.all().order_by("date_joined")
    data = []

    for u in users:
        idea_count = Idea.objects.filter(user=u).count()
        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_active": u.is_active,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "is_admin": getattr(u, "is_admin", False),  # per compatibilità frontend
            "idea_count": idea_count,
            "date_joined": u.date_joined,
        })

    return Response(data, status=status.HTTP_200_OK)


# ============================================================
# 🔹 Ban / Unban utenti
# ============================================================
@api_view(["PATCH"])
@permission_classes([IsAdminOrStaff])
def toggle_user_active(request, user_id):
    """
    Attiva o disattiva un utente (ban / unban)
    """
    admin_user = request.user.username
    logger.info(f"⚙️ Toggle stato utente richiesto da {admin_user} per user_id={user_id}")

    try:
        user = User.objects.get(pk=user_id)
        user.is_active = not user.is_active
        user.save()

        action = "riattivato" if user.is_active else "bannato"
        logger.info(f"✅ Utente {user.username} {action} da {admin_user}")

        return Response(
            {
                "status": "ok",
                "message": f"Utente {action} con successo.",
                "is_active": user.is_active,
            },
            status=status.HTTP_200_OK,
        )
    except User.DoesNotExist:
        logger.error(f"❌ Utente con ID {user_id} non trovato.")
        return Response(
            {"status": "error", "message": "Utente non trovato."},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([IsAdminOrStaff])
def training_stats(request):
    """
    Restituisce statistiche sul training e modelli salvati.
    """
    total_ideas = Idea.objects.count()
    trained_ideas = Idea.objects.filter(used_for_training=True).count()
    new_ideas = total_ideas - trained_ideas

    # Cerca l’ultimo modello salvato
    base_path = os.path.join(os.getcwd(), "models")
    latest_model = None
    if os.path.exists(base_path):
        models = sorted(
            [f for f in os.listdir(base_path) if f.startswith("mindlink-v")],
            reverse=True
        )
        if models:
            latest_model = models[0]

    data = {
        "total_ideas": total_ideas,
        "trained_ideas": trained_ideas,
        "new_ideas": new_ideas,
        "latest_model": latest_model or "Nessun modello ancora salvato",
        "server_time": timezone.now().isoformat(),
    }
    return Response(data)
