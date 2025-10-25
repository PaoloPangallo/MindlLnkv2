from django.contrib import admin, messages
from django.urls import path
from django.shortcuts import redirect
from django.utils.html import format_html
from .semantic_trainer import force_training_now
from .models import Idea

@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at', 'used_for_training', 'training_button')

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('force-train/', self.admin_site.admin_view(self.force_train), name='force_train'),
        ]
        return custom_urls + urls

    def training_button(self, obj):
        return format_html(
            '<a class="button" href="force-train/">⚙️ Avvia Training Istantaneo</a>'
        )
    training_button.short_description = "Training manuale"
    training_button.allow_tags = True

    def force_train(self, request):
        """Chiamata quando si clicca il bottone nel pannello admin."""
        result = force_training_now()
        if result["status"] == "ok":
            messages.success(request, result["message"])
        else:
            messages.error(request, f"Errore: {result['message']}")
        return redirect("..")
