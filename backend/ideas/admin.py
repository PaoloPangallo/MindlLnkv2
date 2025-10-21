from django.contrib import admin
from .models import Idea

@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "created_at")
    search_fields = ("title", "content")
