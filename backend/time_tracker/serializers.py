from rest_framework import serializers
from datetime import datetime, timedelta

from .models import JornadaActiva, Registro


class RegistroSerializer(serializers.ModelSerializer):
    # Campos de salida formateados como esperaba tu frontend
    fecha = serializers.DateField(format="%Y-%m-%d")
    hora_entrada = serializers.TimeField(format="%H:%M")
    hora_salida = serializers.TimeField(format="%H:%M")

    sueldo_por_hora = serializers.FloatField(required=False, allow_null=True)
    # sueldo_registro solo lectura, lo calculas en el modelo
    sueldo_registro = serializers.FloatField(read_only=True)

    # Duraciones en segundos (solo lectura)
    duracion_total = serializers.SerializerMethodField()
    duracion_trabajada = serializers.SerializerMethodField()

    class Meta:
        model = Registro
        # Incluimos todos los campos que usa el frontend
        fields = [
            "id",
            "fecha",
            "hora_entrada",
            "hora_salida",
            "descripcion",
            "lugar",
            "descanso_comida",
            "sueldo_por_hora",
            "duracion_total",
            "duracion_trabajada",
            "sueldo_registro",
        ]
        read_only_fields = [
            "usuario",
            "duracion_total",
            "duracion_trabajada",
            "sueldo_registro",
        ]

    def get_duracion_total(self, obj):
        return obj.duracion_total.total_seconds() if obj.duracion_total else 0

    def get_duracion_trabajada(self, obj):
        return (
            obj.duracion_trabajada.total_seconds()
            if obj.duracion_trabajada
            else 0
        )

    def validate(self, attrs):
        instancia = self.instance
        entrada = attrs.get("hora_entrada", getattr(instancia, "hora_entrada", None))
        salida = attrs.get("hora_salida", getattr(instancia, "hora_salida", None))
        comida = attrs.get("descanso_comida", getattr(instancia, "descanso_comida", False))

        if entrada and salida:
            hoy = datetime.today()
            duracion = datetime.combine(hoy, salida) - datetime.combine(hoy, entrada)
            if duracion <= timedelta(0):
                raise serializers.ValidationError(
                    {"hora_salida": "La salida tiene que ser posterior a la entrada."}
                )
            if comida and duracion <= timedelta(hours=1):
                raise serializers.ValidationError(
                    {"descanso_comida": "Con descanso de comida la jornada debe durar más de 1 h."}
                )
        return attrs


class JornadaActivaSerializer(serializers.ModelSerializer):
    fecha = serializers.DateField(format="%Y-%m-%d", read_only=True)
    hora_entrada = serializers.TimeField(format="%H:%M", read_only=True)

    class Meta:
        model = JornadaActiva
        fields = ["fecha", "hora_entrada", "lugar", "descanso_comida"]
