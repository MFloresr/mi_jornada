from django.contrib import admin
from .models import Profile, Registro


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