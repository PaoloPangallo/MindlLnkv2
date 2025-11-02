import logging
from django.db import IntegrityError
from django.utils import timezone
from .models import Notification

logger = logging.getLogger(__name__)


# ============================================================
# 🔔 FUNZIONI DI ALTO LIVELLO PER LA GENERAZIONE DI NOTIFICHE
# ============================================================

def notify_related_ideas(new_idea, similar_ideas, min_similarity: float = 0.7):
    """
    Crea notifiche per gli autori di idee semanticamente simili a una nuova idea.

    Args:
        new_idea (Idea): L'idea appena creata.
        similar_ideas (list[tuple]): Lista di tuple (idea, score).
        min_similarity (float): Soglia minima di similarità per notificare.
    """
    created_count = 0
    for idea, score in similar_ideas:
        try:
            # Evita self-notifiche o idee sotto soglia
            if idea.owner == new_idea.owner or score < min_similarity:
                continue

            # Controlla se esiste già una notifica recente simile
            if _is_duplicate_notification(
                    user=idea.owner,
                    type="idea_related",
                    related_idea=new_idea,
                    window_minutes=60
            ):
                logger.debug(f"⏳ Notifica duplicata evitata per {idea.owner} → {new_idea.title}")
                continue

            Notification.objects.create(
                user=idea.owner,
                type="idea_related",
                message=f"Nuova idea simile alla tua: '{new_idea.title}' (similarità {score:.2f})",
                related_idea=new_idea
            )
            created_count += 1

        except IntegrityError as e:
            logger.warning(f"⚠️ Errore durante la creazione di notifica: {e}")

    logger.info(f"📬 generate_related_ideas → {created_count} notifiche create per '{new_idea.title}'")
    return created_count


def notify_new_connection(source, target, by_user):
    """
    Crea notifiche per gli autori di due idee collegate tra loro.

    Args:
        source (Idea): Idea di origine.
        target (Idea): Idea di destinazione.
        by_user (User): Utente che ha creato la connessione.
    """
    users_to_notify = {source.owner, target.owner} - {by_user}
    created_count = 0

    for user in users_to_notify:
        try:
            # Evita notifiche duplicate recenti
            if _is_duplicate_notification(
                    user=user,
                    type="connection",
                    related_idea=source,
                    window_minutes=30
            ):
                continue

            Notification.objects.create(
                user=user,
                type="connection",
                message=f"Le idee '{source.title}' e '{target.title}' sono ora connesse.",
                related_idea=source
            )
            created_count += 1

        except IntegrityError as e:
            logger.warning(f"⚠️ Errore creazione notifica connessione: {e}")

    if created_count > 0:
        logger.info(f"🔗 {created_count} notifiche di connessione create per '{source.title}' ↔ '{target.title}'")
    return created_count


# ============================================================
# 🧠 FUNZIONI DI SUPPORTO
# ============================================================

def _is_duplicate_notification(user, type, related_idea, window_minutes: int = 60) -> bool:
    """
    Controlla se esiste già una notifica simile inviata di recente, per evitare spam.

    Args:
        user (User): destinatario.
        type (str): tipo di notifica.
        related_idea (Idea): oggetto associato.
        window_minutes (int): intervallo temporale entro cui evitare duplicati.
    """
    if not user or not related_idea:
        return False

    time_threshold = timezone.now() - timezone.timedelta(minutes=window_minutes)
    exists = Notification.objects.filter(
        user=user,
        type=type,
        related_idea=related_idea,
        created_at__gte=time_threshold
    ).exists()
    return exists
