from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("research/", views.start_research),
    path("research/<str:job_id>/", views.job_status),
]
