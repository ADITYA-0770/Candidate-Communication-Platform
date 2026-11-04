from django.urls import path
from .views import CandidateView, SingleCandidateView

urlpatterns = [
    path('candidates/', CandidateView.as_view(), name='candidates'),
    path('candidates/<uuid:id>/', SingleCandidateView.as_view(), name='single-candidate'),
]
