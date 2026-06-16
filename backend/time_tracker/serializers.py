from rest_framework import serializers
from .models import Registro


class RegistroSerializer(serializers.ModelSerializer):
    # Campos de salida formateados como esperaba tu frontend
    fecha = serializers.DateField(format="%Y-%m-%d")
    hora_entrada = serializers.TimeField(format="%H:%M")
    hora_salida = serializers.TimeField(format="%H:%M")

    sueldo_por_hora = serializers.FloatField()
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