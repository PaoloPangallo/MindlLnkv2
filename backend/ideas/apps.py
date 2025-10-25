# ideas/apps.py
from django.apps import AppConfig


class IdeasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ideas"

    def ready(self):
        # Nessun signal da registrare: lasciamo vuoto.
        # (Se in futuro riattivi i signals, importa qui: import ideas.signals)
        pass
