"""
Cuenta de demostración pública.

Cualquiera puede entrar con ella (botón "Probar la demo" o /?demo=1), así que sus
datos son ficticios y se regeneran solos: al entrar, si nadie la ha usado en la
última hora, se borran sus registros y se crean de nuevo en torno a la fecha de hoy.
"""
import random
from datetime import timedelta, time
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from .models import JornadaActiva, PasswordResetToken, Registro

LUGARES = ["Obra Diagonal", "Taller Poblenou", "Oficina"]
DESCRIPCIONES = ["Instalación", "Revisión", "Mantenimiento", "Montaje", ""]
REINICIAR_TRAS = timedelta(hours=1)


def es_demo(user):
    return bool(user and user.is_authenticated and user.email.lower() == settings.DEMO_EMAIL.lower())


def debe_reiniciarse(user):
    """Nadie la ha usado en la última hora (last_login antes de hacer login)."""
    return user.last_login is None or timezone.now() - user.last_login > REINICIAR_TRAS


@transaction.atomic
def preparar_demo():
    """Crea la cuenta demo si no existe y regenera sus datos. Devuelve el usuario."""
    user, _ = User.objects.get_or_create(
        username="demo", defaults={"email": settings.DEMO_EMAIL, "first_name": "Demo"}
    )
    user.email = settings.DEMO_EMAIL
    user.first_name = "Demo"
    user.is_staff = user.is_superuser = False
    user.set_password(settings.DEMO_PASSWORD)
    user.save()
    user.profile.sueldo_por_hora = Decimal("12.50")
    user.profile.save()

    Registro.objects.filter(usuario=user).delete()
    JornadaActiva.objects.filter(usuario=user).delete()
    PasswordResetToken.objects.filter(user=user).delete()

    # Los mismos datos durante todo el día, distintos de un día a otro
    hoy = timezone.localdate()
    azar = random.Random(hoy.toordinal())
    sueldo = user.profile.sueldo_por_hora
    registros = []

    def registro(dia, entrada, salida, lugar, descripcion, comida=False):
        r = Registro(usuario=user, fecha=dia, hora_entrada=time(entrada), hora_salida=time(salida), lugar=lugar,
                     descripcion=descripcion, descanso_comida=comida, sueldo_por_hora=sueldo)
        r.calcular_duraciones_y_sueldo()  # bulk_create no llama a save()
        registros.append(r)

    dia = hoy - timedelta(days=35)
    while dia < hoy:
        if dia.weekday() < 5:
            lugar = azar.choices(LUGARES, [5, 3, 2])[0]
            if azar.random() < 0.35:  # jornada partida
                registro(dia, 8, 14, lugar, "Montaje")
                registro(dia, 16, azar.choice([18, 19]), lugar, "Acabados")
            else:
                registro(dia, azar.choice([7, 8]), azar.choice([16, 17]), lugar, azar.choice(DESCRIPCIONES), comida=True)
        dia += timedelta(days=1)
    # Una sola consulta: la base de datos está lejos de las funciones de Vercel
    Registro.objects.bulk_create(registros)
    return user
