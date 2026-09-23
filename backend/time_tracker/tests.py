from datetime import date, datetime, time
from unittest import mock
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import JornadaActiva, Registro

MADRID = ZoneInfo("Europe/Madrid")


def a_las(y, m, d, hh, mm):
    return datetime(y, m, d, hh, mm, tzinfo=MADRID)


class BaseAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("mario", "mario@example.com", "clave-segura-123")
        self.user.profile.sueldo_por_hora = 12
        self.user.profile.save()
        self.client = APIClient()
        self.client.force_authenticate(self.user)


class MeTests(TestCase):
    def test_sin_sesion_devuelve_401(self):
        self.assertEqual(self.client.get("/api/me/").status_code, 401)

    def test_con_sesion_devuelve_datos(self):
        user = User.objects.create_user("ana", "ana@example.com", "clave-segura-123")
        self.client.force_login(user)
        data = self.client.get("/api/me/").json()
        self.assertEqual(data["email"], "ana@example.com")
        self.assertEqual(data["sueldo_por_hora"], 10.0)


class JornadaTests(BaseAPITest):
    @mock.patch("django.utils.timezone.now", return_value=a_las(2026, 9, 23, 8, 2))
    def test_iniciar_y_terminar_crea_registro(self, _now):
        r = self.client.post("/api/jornada/iniciar/", {"lugar": "Obra Sants"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["activa"]["hora_entrada"], "08:02")

        self.assertEqual(
            self.client.post("/api/jornada/iniciar/").status_code, 409
        )
        self.client.patch("/api/jornada/", {"descanso_comida": True}, format="json")

        _now.return_value = a_las(2026, 9, 23, 17, 2)
        r = self.client.post("/api/jornada/terminar/")
        self.assertEqual(r.status_code, 201)
        reg = Registro.objects.get()
        self.assertEqual(reg.hora_salida, time(17, 2))
        self.assertEqual(reg.lugar, "Obra Sants")
        self.assertEqual(float(reg.sueldo_registro), 96.0)
        self.assertFalse(JornadaActiva.objects.exists())

    def test_terminar_otro_dia_devuelve_409(self):
        JornadaActiva.objects.create(usuario=self.user, fecha=date(2026, 9, 22), hora_entrada=time(22, 0))
        with mock.patch("django.utils.timezone.now", return_value=a_las(2026, 9, 23, 2, 0)):
            r = self.client.post("/api/jornada/terminar/")
        self.assertEqual(r.status_code, 409)
        self.assertTrue(JornadaActiva.objects.exists())

    def test_descartar(self):
        JornadaActiva.objects.create(usuario=self.user, fecha=date(2026, 9, 23), hora_entrada=time(8, 0))
        self.assertEqual(self.client.delete("/api/jornada/").status_code, 204)
        self.assertEqual(self.client.get("/api/jornada/").json(), {"activa": None})


class RegistroValidacionTests(BaseAPITest):
    def crear(self, **extra):
        data = {"fecha": "2026-09-22", "hora_entrada": "08:00", "hora_salida": "17:00", "lugar": "Obra Sants"}
        data.update(extra)
        return self.client.post("/api/registros/", data, format="json")

    def test_sin_sueldo_usa_el_del_perfil(self):
        r = self.crear(descanso_comida=True)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["sueldo_registro"], 96.0)

    def test_salida_antes_de_entrada(self):
        self.assertEqual(self.crear(hora_salida="07:00").status_code, 400)

    def test_comida_en_jornada_corta(self):
        self.assertEqual(self.crear(hora_salida="08:45", descanso_comida=True).status_code, 400)
