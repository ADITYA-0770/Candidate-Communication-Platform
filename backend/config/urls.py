from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "healthy", "service": "Candidate Communication Platform API"})

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('candidates.urls')),
    path('api/', include('messaging.urls')),
]
