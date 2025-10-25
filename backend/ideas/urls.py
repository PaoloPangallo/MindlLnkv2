# ideas/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views_training
from .ai_utils import similar_ideas
from .views_graph import get_map
from .view_connections import ConnectionViewSet
from .views import (
    IdeaViewSet,
    analyze_idea_endpoint,
    refresh_all_analysis_endpoint,
    CustomTokenRefreshView,
)
from .auth_views import RegisterView, login_view
from .views_search import search_ideas

app_name = "ideas"  # ✅ Namespace

# Routers
router = DefaultRouter()
router.register(r"ideas", IdeaViewSet, basename="idea")
router.register(r"connections", ConnectionViewSet, basename="connection")

urlpatterns = [
    # ======================================================
    # 🔹 AUTENTICAZIONE JWT
    # ======================================================
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", login_view, name="login"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),

    # ======================================================
    # 🔹 ANALISI / AI
    # ======================================================
    path("analyze/", analyze_idea_endpoint, name="analyze_idea"),
    path("refresh/", refresh_all_analysis_endpoint, name="refresh_analysis"),
    path("similar/", similar_ideas, name="similar_ideas"),

    path('ideas/search/', search_ideas, name='search-ideas'),

                  # ======================================================
    # 🔹 MAPPA E TRAINING
    # ======================================================
    path("map/", get_map, name="get_map"),
    path("training/start/", views_training.start_training, name="start_training"),
] + router.urls
