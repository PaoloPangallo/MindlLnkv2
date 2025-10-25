from django.db import models
from django.contrib.auth.models import User


class Idea(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    # Campi AI
    summary = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    keywords = models.JSONField(blank=True, null=True)
    embedding = models.JSONField(default=list, blank=True)  # per salvare vettore semantico
    used_for_training = models.BooleanField(default=False)

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
