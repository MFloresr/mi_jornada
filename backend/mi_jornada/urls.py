"""
URL configuration for mi_jornada project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import Http404, HttpResponse
from django.urls import path, include, re_path
from django.views.generic import TemplateView


def archivo_de_plantillas(nombre, tipo, cabeceras=None):
    """Sirve tal cual un archivo de templates/ (sin pasarlo por el motor de plantillas)."""
    ruta = Path(settings.BASE_DIR).parent / "templates" / nombre

    def vista(request):
        try:
            contenido = ruta.read_bytes()
        except FileNotFoundError:
            raise Http404(nombre)
        respuesta = HttpResponse(contenido, content_type=tipo)
        for clave, valor in (cabeceras or {}).items():
            respuesta[clave] = valor
        return respuesta

    return vista

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
    # Enlace del email de recuperación: lo resuelve la SPA
    re_path(r"^reset-password/[^/]+/?$", TemplateView.as_view(template_name="index.html")),
    path('api/', include('time_tracker.urls')),  # API para el frontend
    # App instalable: el service worker tiene que colgar de la raíz para controlar toda la web
    path(
        "sw.js",
        archivo_de_plantillas("sw.js", "application/javascript; charset=utf-8", {"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"}),
    ),
    path(
        "manifest.webmanifest",
        archivo_de_plantillas("manifest.webmanifest", "application/manifest+json", {"Cache-Control": "public, max-age=3600"}),
    ),
]
