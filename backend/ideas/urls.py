# ideas/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 🔹 Import view principali
from . import admin_views
from .ai_utils import similar_ideas
from ideas.views.views_graph import get_map
from ideas.views.view_connections import ConnectionViewSet
from .auth_views import RegisterView, login_view
from ideas.views.views_search import search_ideas
from .views import views_graph
from .views.views import (
    CustomTokenRefreshView,
    analyze_idea_endpoint,
    refresh_all_analysis_endpoint,
    IdeaViewSet
)
from .views.views_settings import user_settings, user_avatar

app_name = "ideas"

# ======================================================
# 🔹 ROUTER REST FRAMEWORK
# ======================================================
router = DefaultRouter()
router.register(r"ideas", IdeaViewSet, basename="idea")
router.register(r"connections", ConnectionViewSet, basename="connection")

# ======================================================
# 🔹 URL PATTERNS
# ======================================================
urlpatterns = [
    # ======================================================
    # 🧩 AUTENTICAZIONE JWT
    # ======================================================
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", login_view, name="login"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),

    # ======================================================
    # 🤖 ANALISI / AI
    # ======================================================
    path("analyze/", analyze_idea_endpoint, name="analyze_idea"),
    path("refresh/", refresh_all_analysis_endpoint, name="refresh_analysis"),
    path("similar/", similar_ideas, name="similar_ideas"),

    # ======================================================
    # 🔍 RICERCA IDEE
    # ======================================================
    path("ideas/search/", search_ideas, name="search_ideas"),

    # ======================================================
    # ⚙️ IMPOSTAZIONI UTENTE
    # ======================================================
    path("user/settings/", user_settings, name="user_settings"),
    path("user/avatar/", user_avatar, name="user_avatar"),  # 👈 nuovo endpoint

    # ======================================================
    # 🛠️ ADMIN / TRAINING
    # ======================================================
    path("admin/users/", admin_views.list_users, name="list_users"),
    path("admin/users/<int:user_id>/toggle/", admin_views.toggle_user_active, name="toggle_user_active"),
    path("training/stats/", admin_views.training_stats, name="training_stats"),
    path("training/start/", admin_views.start_training, name="start_training"),

    # ======================================================
    # 🗺️ MAPPE / GRAFI
    # ======================================================
    path("ideas/map/self/", views_graph.get_user_map, name="get_user_map"),
    path("map/", get_map, name="get_map"),

]


# ======================================================
# 🔹 Aggiungi le rotte REST generate automaticamente
# ======================================================
urlpatterns += router.urls
