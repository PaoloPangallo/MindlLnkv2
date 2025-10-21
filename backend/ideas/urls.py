from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views_training
from .auth_views import RegisterView, login_view
from .views import IdeaViewSet
from .view_connections import ConnectionViewSet
from .views_graph import get_map
from .analyze import analyze_idea, refresh_analysis

router = DefaultRouter()
router.register(r'ideas', IdeaViewSet, basename='idea')
router.register(r'connections', ConnectionViewSet, basename='connection')

urlpatterns = [
    path('analyze/', analyze_idea, name='analyze_idea'),
    path('refresh/', refresh_analysis, name='refresh_analysis'),
    path('map/', get_map, name='get_map'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', login_view, name='login'),
    path('training/start/', views_training.start_training, name='start_training'),
] + router.urls
