from pathlib import Path
import os

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# Vercel define VERCEL=1 tanto en el build como en ejecución
ON_VERCEL = bool(os.environ.get("VERCEL"))

# --- Seguridad / entorno ---

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if ON_VERCEL:
        raise RuntimeError("Falta la variable de entorno DJANGO_SECRET_KEY")
    SECRET_KEY = "django-insecure-gkr3_jux!5p6p%nf5acx40nlp(ra1%xd*xj5!5kxn6qlax_=#y"  # solo desarrollo

DEBUG = os.environ.get("DJANGO_DEBUG") == "1"

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    ".vercel.app",
    *filter(None, os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")),
]

if ON_VERCEL:
    # Vercel termina el HTTPS y reenvía la petición al function
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "time_tracker.apps.TimeTrackerConfig",
    "rest_framework",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# --- CORS / CSRF ---

# En Vercel el frontend y la API comparten dominio, así que Django ya acepta
# esas peticiones; aquí solo hacen falta orígenes distintos del propio host.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",                # para desarrollo con Vite
    "http://127.0.0.1:5173",
    *filter(None, os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")),
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",                # Vite / Vue en local
    "http://127.0.0.1:5173",
    # Si en algún momento sirves frontend desde otro dominio, añádelo aquí
]

ROOT_URLCONF = "mi_jornada.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR.parent / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "mi_jornada.wsgi.application"

# --- Base de datos ---
# Con DATABASE_URL (p. ej. Postgres de Supabase) se usa esa base;
# sin ella, SQLite local para desarrollo.
# conn_max_age=0: la conexión se cierra al acabar cada petición. En Vercel hay
# muchas instancias a la vez y el pooler de Supabase en modo sesión solo admite
# 15 clientes; mantenerlas abiertas agotaba las conexiones.

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=0,
        conn_health_checks=True,
        ssl_require=bool(os.environ.get("DATABASE_URL")),
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es"
TIME_ZONE = "Europe/Madrid"
USE_I18N = True
USE_TZ = True

# --- Static files ---
# El build de Vite escribe en backend/static; Vercel ejecuta collectstatic
# automáticamente (porque STATIC_ROOT está definido) y los sirve desde su CDN.

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "static_root"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Integración frontend / email ---

FRONTEND_BASE_URL = os.environ.get(
    "FRONTEND_BASE_URL",
    "http://localhost:5173",  # por defecto, entorno de desarrollo
)

# Con EMAIL_HOST_USER y EMAIL_HOST_PASSWORD se envía por SMTP (por defecto
# Gmail, con una contraseña de aplicación); sin ellas, los correos se
# muestran en la consola.
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = True
    EMAIL_TIMEOUT = 10
    DEFAULT_FROM_EMAIL = f"Mi Jornada <{EMAIL_HOST_USER}>"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    DEFAULT_FROM_EMAIL = "no-reply@mi-jornada.local"
# Asistente de IA (registro de jornadas en lenguaje natural)
# Se activa al definir GEMINI_API_KEY (gratuita) o ANTHROPIC_API_KEY.
# IA_MODELO vacío = modelo por defecto del proveedor (ver time_tracker/ia.py).
IA_MODELO = os.environ.get("IA_MODELO", "")
IA_LIMITE_DIARIO = int(os.environ.get("IA_LIMITE_DIARIO", "40"))
