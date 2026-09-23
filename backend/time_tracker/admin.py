from django.contrib import admin
from .models import JornadaActiva, Profile, Registro, UsoIA


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "sueldo_por_hora")


@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
    list_display = (
        "usuario",
        "fecha",
        "hora_entrada",
        "hora_salida",
        "descanso_comida",
        "duracion_trabajada",
        "sueldo_registro",
        "lugar",
    )
    list_filter = ("usuario", "fecha", "lugar", "descanso_comida")
    search_fields = ("usuario__username", "descripcion", "lugar")


@admin.register(JornadaActiva)
class JornadaActivaAdmin(admin.ModelAdmin):
    list_display = ("usuario", "fecha", "hora_entrada", "lugar", "descanso_comida")


@admin.register(UsoIA)
class UsoIAAdmin(admin.ModelAdmin):
    list_display = ("usuario", "dia", "peticiones")
    list_filter = ("dia",)
