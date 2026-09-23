import json
from datetime import date, datetime, time
from unittest import mock
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import JornadaActiva, Registro, UsoIA

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


class IATests(BaseAPITest):
    def respuesta_falsa(self, datos, stop_reason="end_turn"):
        bloque = mock.Mock(type="text", text=json.dumps(datos))
        return mock.Mock(stop_reason=stop_reason, content=[bloque], _request_id="req_test")

    def llamar(self, texto, datos=None, **kw):
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}), \
             mock.patch("time_tracker.ia.anthropic.Anthropic") as cliente, \
             mock.patch("django.utils.timezone.now", return_value=a_las(2026, 9, 23, 18, 0)):
            if datos is not None:
                cliente.return_value.beta.messages.create.return_value = self.respuesta_falsa(datos, **kw)
            r = self.client.post("/api/ia/interpretar/", {"texto": texto}, format="json")
            return r, cliente

    def test_sin_clave_no_disponible(self):
        self.client.force_login(self.user)
        with mock.patch.dict("os.environ", {}, clear=True):
            self.assertFalse(self.client.get("/api/me/").json()["ia_disponible"])
            self.assertEqual(self.client.post("/api/ia/interpretar/", {"texto": "x"}, format="json").status_code, 503)

    def test_interpreta_y_valida(self):
        Registro.objects.create(usuario=self.user, fecha=date(2026, 9, 1), hora_entrada=time(8), hora_salida=time(9), lugar="Obra Sants")
        datos = {
            "registros": [
                {"fecha": "2026-09-22", "hora_entrada": "16:00", "hora_salida": "19:00", "lugar": "Obra Sants", "descanso_comida": False, "descripcion": ""},
                {"fecha": "2026-09-22", "hora_entrada": "08:00", "hora_salida": "14:00", "lugar": "Obra Sants", "descanso_comida": False, "descripcion": ""},
                {"fecha": "2026-09-22", "hora_entrada": "20:00", "hora_salida": "19:00", "lugar": "", "descanso_comida": False, "descripcion": ""},
            ],
            "aviso": "",
        }
        r, cliente = self.llamar("ayer de 8 a 14 y de 16 a 19 en la obra de Sants", datos)
        self.assertEqual(r.status_code, 200)
        cuerpo = r.json()
        self.assertEqual([x["hora_entrada"] for x in cuerpo["registros"]], ["08:00", "16:00"])
        self.assertIn("quitado", cuerpo["aviso"])
        # El contexto incluye la fecha de hoy y los lugares habituales
        mensaje = cliente.return_value.beta.messages.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("2026-09-23", mensaje)
        self.assertIn("Obra Sants", mensaje)
        self.assertEqual(Registro.objects.count(), 1)  # no guarda nada

    def test_rechazo_del_modelo(self):
        r, _ = self.llamar("algo", {"registros": [], "aviso": ""}, stop_reason="refusal")
        self.assertEqual(r.status_code, 502)

    def test_limite_diario(self):
        UsoIA.objects.create(usuario=self.user, dia=date(2026, 9, 23), peticiones=40)
        r, cliente = self.llamar("hoy de 8 a 17", {"registros": [], "aviso": ""})
        self.assertEqual(r.status_code, 429)
        cliente.return_value.beta.messages.create.assert_not_called()
