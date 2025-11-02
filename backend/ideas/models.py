from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.contrib.auth.models import User
from django.db.models import JSONField
from django.contrib.postgres.search import SearchVector, SearchVectorField


class Idea(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    # Campi AI
    summary = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    keywords = models.JSONField(blank=True, null=True)
    embedding = models.JSONField(default=list, blank=True)
    used_for_training = models.BooleanField(default=False)

    # 🔹 Campo indicizzato per ricerche full-text PostgreSQL
    search_vector = SearchVectorField(null=True)

    def save(self, *args, **kwargs):
        """
        Aggiorna automaticamente il vettore di ricerca
        basato su title e content ogni volta che l'idea viene salvata.
        """
        super().save(*args, **kwargs)
        # Aggiorna il vettore (solo dopo che l'oggetto esiste nel DB)
        Idea.objects.filter(pk=self.pk).update(
            search_vector=(
                    SearchVector('title', weight='A') +
                    SearchVector('content', weight='B')
            )
        )

    class Meta:
        indexes = [
            # 🔹 Indice GIN per velocizzare la ricerca full-text
            GinIndex(fields=['search_vector']),
        ]

    def __str__(self):
        return self.title


class Connection(models.Model):
    source = models.ForeignKey(
        'Idea', related_name='outgoing_connections', on_delete=models.CASCADE
    )
    target = models.ForeignKey(
        'Idea', related_name='incoming_connections', on_delete=models.CASCADE
    )
    type = models.CharField(max_length=50, default='related')
    strength = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source.title} → {self.target.title} ({self.type})"

    class Meta:
        unique_together = ("source", "target", "type")


class UserSettings(models.Model):
    """
    Impostazioni personalizzate per ogni utente MindLink.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    preferences = JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Impostazioni di {self.user.username}"

    @staticmethod
    def default_preferences():
        return {
            "profile": {"display_name": "", "bio": "", "language": "it"},
            "appearance": {"theme": "dark", "accent_color": "#60a5fa"},
            "notifications": {
                "email_updates": True,
                "ai_suggestions": True,
                "graph_alerts": False,
                "weekly_summary": True,
            },
            "ai": {
                "model": "all-MiniLM-L6-v2",
                "similarity_threshold": 0.7,
                "auto_suggestions": True,
                "allow_training_data": False,
            },
            "privacy": {
                "visibility": "public",
                "consent_ai": False,
                "data_retention": "1y",
            },
        }

    def save(self, *args, **kwargs):
        if not self.preferences:
            self.preferences = self.default_preferences()
        super().save(*args, **kwargs)
