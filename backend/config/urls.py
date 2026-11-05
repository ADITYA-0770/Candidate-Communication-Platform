from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse, HttpResponse

def health_check(request):
    return JsonResponse({"status": "healthy", "service": "Candidate Communication Platform API"})

urlpatterns = [
    path('', health_check),
    path('favicon.ico', lambda r: HttpResponse(status=204)),
    path('admin/', admin.site.urls),
    path('api/', include('candidates.urls')),
    path('api/', include('messaging.urls')),
]
