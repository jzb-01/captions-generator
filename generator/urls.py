from django.urls import path
from . import views

urlpatterns = [
    path('', views.set_interface),
    path('api/add_cue/', views.add_cue),
    path('api/save_cue/<int:pk>/', views.save_cue),
    path('api/delete_cue/<int:pk>/', views.delete_cue),
    path('api/format_file/', views.format_file),
]