from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include

from mindlink_core import settings


def home(request):
    return JsonResponse({
        "MindLink": "API attiva",
        "endpoints": ["/api/ideas/", "/api/ideas/similar/"]
    })


urlpatterns = [
    path('', home),  # 👈 home di test
    path('admin/', admin.site.urls),
    path('api/', include('ideas.urls')),
    path("api/notifications/", include("notifications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
