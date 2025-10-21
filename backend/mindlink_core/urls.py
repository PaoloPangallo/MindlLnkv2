from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def home(request):
    return JsonResponse({
        "MindLink": "API attiva",
        "endpoints": ["/api/ideas/", "/api/ideas/similar/"]
    })


urlpatterns = [
    path('', home),  # 👈 home di test
    path('admin/', admin.site.urls),
    path('api/', include('ideas.urls')),
]
