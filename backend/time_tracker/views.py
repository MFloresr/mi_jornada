import json

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db.models import Count, Sum
from django.http import HttpResponseBadRequest, JsonResponse
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PasswordResetToken, Registro
from .serializers import RegistroSerializer


# ---------- Sugerencias de lugares ----------
@require_GET
def lugares_sugeridos(request):
    """
    Devuelve los lugares más usados por el usuario autenticado,
    opcionalmente filtrados por el parámetro ?q=.
    """
    usuario = request.user
    term = request.GET.get("q", "").strip().lower()

    if not usuario.is_authenticated:
        return JsonResponse([], safe=False)

    qs = (
        Registro.objects.filter(usuario=usuario)
        .exclude(lugar="")
        .values("lugar")
        .annotate(num=Count("id"))
        .order_by("-num")
    )

    if term:
        qs = [r for r in qs if term in r["lugar"].lower()]
    else:
        qs = list(qs)

    lugares = [r["lugar"] for r in qs[:10]]
    return JsonResponse(lugares, safe=False)


# ---------- Autenticación ----------
@require_http_methods(["POST"])
def login_view(request):
    """
    Login por email + password.
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return HttpResponseBadRequest("Faltan credenciales")

    UserModel = get_user_model()

    try:
        user = UserModel.objects.get(email=email)
    except UserModel.DoesNotExist:
        return JsonResponse({"detail": "Credenciales inválidas"}, status=400)

    user = authenticate(request, username=user.username, password=password)
    if user is None:
        return JsonResponse({"detail": "Credenciales inválidas"}, status=400)

    login(request, user)

    es_admin = user.is_superuser or user.is_staff

    return JsonResponse(
        {
            "ok": True,
            "detail": "Login correcto",
            "username": user.username,
            "email": user.email,
            "es_admin": es_admin,
        }
    )


@require_http_methods(["POST"])
def logout_view(request):
    """
    Logout del usuario autenticado.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Ya estás deslogueado"}, status=200)

    logout(request)
    return JsonResponse({"detail": "Logout correcto"})


# ---------- Reset de contraseña ----------
@require_http_methods(["POST"])
def password_reset_request_view(request):
    """
    Solicita un reset de contraseña enviando un email con token.
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    email = body.get("email")
    if not email:
        return HttpResponseBadRequest("Falta email")

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # No revelamos si existe o no
        return JsonResponse(
            {"detail": "Si el email existe, se enviará un enlace"}, status=200
        )

    token = get_random_string(48)
    PasswordResetToken.objects.create(user=user, token=token)

    reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password/{token}"

    send_mail(
        subject="Recuperar contraseña",
        message=f"Para cambiar tu contraseña, entra en: {reset_url}",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[email],
        fail_silently=True,
    )

    return JsonResponse(
        {"detail": "Si el email existe, se enviará un enlace"}, status=200
    )


@require_http_methods(["POST"])
def password_reset_confirm_view(request, token):
    """
    Confirma el reset de contraseña a partir de un token.
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    new_password = body.get("password")
    if not new_password:
        return HttpResponseBadRequest("Falta nueva contraseña")

    try:
        prt = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return JsonResponse({"detail": "Token inválido"}, status=400)

    if not prt.is_valid():
        prt.delete()
        return JsonResponse({"detail": "Token caducado"}, status=400)

    user = prt.user
    user.set_password(new_password)
    user.save()

    prt.delete()

    return JsonResponse({"detail": "Contraseña actualizada correctamente"})


# ---------- CSRF ping ----------
@require_GET
@ensure_csrf_cookie
def csrf_ping(request):
    """
    Endpoint para que la SPA obtenga la cookie 'csrftoken'.
    """
    return JsonResponse({"detail": "ok"})


# ---------- DRF: ViewSet para Registro ----------
class RegistroViewSet(viewsets.ModelViewSet):
    """
    ViewSet DRF para listar y crear registros.
    - GET /api/registros/   -> listado filtrado por usuario/admin
    - POST /api/registros/  -> crear registro para el usuario autenticado
    """
    serializer_class = RegistroSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user

        es_admin = usuario.is_authenticated and (
            usuario.is_superuser or usuario.is_staff
        )

        # Admin ve todos, usuario normal solo los suyos
        if es_admin:
            qs = Registro.objects.all().order_by("-fecha", "-hora_entrada")
        else:
            qs = Registro.objects.filter(usuario=usuario).order_by(
                "-fecha", "-hora_entrada"
            )

        # Filtro opcional por fecha (?fecha=YYYY-MM-DD)
        fecha_str = self.request.query_params.get("fecha")
        if fecha_str:
            qs = qs.filter(fecha=fecha_str)

        return qs

    def list(self, request, *args, **kwargs):
        """
        Devuelve:
        {
          "es_admin": bool,
          "registros": [...],
          "totales": {...}
        }
        """
        usuario = request.user
        queryset = self.get_queryset()

        es_admin = usuario.is_authenticated and (
            usuario.is_superuser or usuario.is_staff
        )

        # Agregados
        agg = queryset.aggregate(
            total_duracion_trabajada=Sum("duracion_trabajada"),
            total_sueldo=Sum("sueldo_registro"),
        )
        total_duracion_trabajada = agg["total_duracion_trabajada"] or 0
        total_sueldo = agg["total_sueldo"] or 0

        if total_duracion_trabajada:
            total_duracion_segundos = int(total_duracion_trabajada.total_seconds())
        else:
            total_duracion_segundos = 0

        # Serialización
        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {
                "es_admin": es_admin,
                "registros": serializer.data,
                "totales": {
                    "duracion_trabajada_segundos": total_duracion_segundos,
                    "sueldo_total": float(total_sueldo),
                },
            }
        )

    def perform_create(self, serializer):
        """
        Al crear un registro:
        - usuario = request.user
        - sueldo_por_hora por defecto según profile o 10.00
        """
        usuario = self.request.user
        sueldo_por_hora = serializer.validated_data.get("sueldo_por_hora")

        if sueldo_por_hora is None:
            profile = getattr(usuario, "profile", None)
            if profile:
                sueldo_por_hora = float(profile.sueldo_por_hora)
            else:
                sueldo_por_hora = 10.00

        serializer.save(usuario=usuario, sueldo_por_hora=sueldo_por_hora)