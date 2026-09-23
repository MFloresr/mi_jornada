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
    dia = hoy - timedelta(days=35)
    while dia < hoy:
        if dia.weekday() < 5:
            lugar = azar.choices(LUGARES, [5, 3, 2])[0]
            if azar.random() < 0.35:  # jornada partida
                Registro.objects.create(usuario=user, fecha=dia, hora_entrada=time(8), hora_salida=time(14),
                                        lugar=lugar, descripcion="Montaje", sueldo_por_hora=sueldo)
                Registro.objects.create(usuario=user, fecha=dia, hora_entrada=time(16),
                                        hora_salida=time(azar.choice([18, 19])), lugar=lugar,
                                        descripcion="Acabados", sueldo_por_hora=sueldo)
            else:
                Registro.objects.create(usuario=user, fecha=dia, hora_entrada=time(azar.choice([7, 8])),
                                        hora_salida=time(azar.choice([16, 17])), lugar=lugar,
                                        descanso_comida=True, descripcion=azar.choice(DESCRIPCIONES),
                                        sueldo_por_hora=sueldo)
        dia += timedelta(days=1)
    return user
