# ideas/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views_training
from .ai_utils import similar_ideas
from .auth_views import RegisterView, login_view
from .views_graph import get_map
from .views import (
    IdeaViewSet,
    analyze_idea_endpoint,
    refresh_all_analysis_endpoint,
)
from .view_connections import ConnectionViewSet

app_name = "ideas"  # ✅ Namespace per evitare collisioni URL

router = DefaultRouter()
router.register(r"ideas", IdeaViewSet, basename="idea")
router.register(r"connections", ConnectionViewSet, basename="connection")

urlpatterns = [
    # 🔹 Analisi AI
    path("analyze/", analyze_idea_endpoint, name="analyze_idea"),
    path("refresh/", refresh_all_analysis_endpoint, name="refresh_analysis"),

    # 🔹 Visualizzazione grafo
    path("map/", get_map, name="get_map"),
    path("similar/", similar_ideas, name="similar_ideas"),

                  # 🔹 Autenticazione
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", login_view, name="login"),

    # 🔹 Training manuale
    path("training/start/", views_training.start_training, name="start_training"),
] + router.urls
