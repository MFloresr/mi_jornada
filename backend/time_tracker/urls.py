from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroViewSet
from . import views

router = DefaultRouter()
router.register(r"registros", RegistroViewSet, basename="registro")

urlpatterns = [
    # Rutas del router DRF (registros/)
    path("", include(router.urls)),

    # Lugares sugeridos
    path("lugares/", views.lugares_sugeridos, name="lugares_sugeridos"),

    # Auth
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("password-reset/", views.password_reset_request_view, name="password_reset_request"),
    path("password-reset/<str:token>/", views.password_reset_confirm_view, name="password_reset_confirm"),
    path("csrf-ping/", views.csrf_ping, name="csrf_ping"),
]