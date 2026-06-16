from datetime import datetime, timedelta, timezone

from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    sueldo_por_hora = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=10.00,
        help_text="Sueldo base por hora en euros"
    )

    def __str__(self):
        return f"{self.user.username} - {self.sueldo_por_hora} €/h"


class Registro(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="registros")
    fecha = models.DateField()
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField()
    descripcion = models.TextField(blank=True)
    lugar = models.CharField(max_length=200)

    descanso_comida = models.BooleanField(
        default=False,
        help_text="Si está marcado se restará 1h de comida"
    )

    # Copia del sueldo/hora del usuario en el momento del registro
    sueldo_por_hora = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Sueldo por hora aplicado a este registro"
    )

    # Campos calculados automáticamente
    duracion_total = models.DurationField(editable=False)
    duracion_trabajada = models.DurationField(editable=False)
    sueldo_registro = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        editable=False,
        help_text="Importe ganado en este registro"
    )

    class Meta:
        ordering = ["-fecha", "-hora_entrada"]

    def __str__(self):
        return f"{self.usuario.username} - {self.fecha} ({self.duracion_trabajada})"

    def calcular_duraciones_y_sueldo(self):
        # Combinar fecha + horas para poder restar
        entrada_dt = datetime.combine(self.fecha, self.hora_entrada)
        salida_dt = datetime.combine(self.fecha, self.hora_salida)

        # Duración total
        self.duracion_total = salida_dt - entrada_dt

        # Duración trabajada (restando 1h si hay comida)
        if self.descanso_comida:
            self.duracion_trabajada = self.duracion_total - timedelta(hours=1)
        else:
            self.duracion_trabajada = self.duracion_total

        # Pasar duración trabajada a horas decimales
        horas_trabajadas = self.duracion_trabajada.total_seconds() / 3600

        # Calcular sueldo del registro
        self.sueldo_registro = round(horas_trabajadas * float(self.sueldo_por_hora), 2)

    def save(self, *args, **kwargs):
        # Si no se ha definido sueldo_por_hora, usar el del Profile del usuario
        if self.sueldo_por_hora is None:
            profile = getattr(self.usuario, "profile", None)
            if profile:
                self.sueldo_por_hora = profile.sueldo_por_hora

        # Calcular duraciones y sueldo antes de guardar
        self.calcular_duraciones_y_sueldo()
        super().save(*args, **kwargs)

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # válido 1 hora
        return self.created_at >= timezone.now() - timedelta(hours=1)
    