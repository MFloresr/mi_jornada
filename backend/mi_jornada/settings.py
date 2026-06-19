from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Seguridad / entorno ---

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-gkr3_jux!5p6p%nf5acx40nlp(ra1%xd*xj5!5kxn6qlax_=#y",  # solo fallback para desarrollo
)

# En PythonAnywhere: producción
DEBUG = False

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "mflores.pythonanywhere.com",
    ".pythonanywhere.com",  # opcional, por si acaso subdominios [web:50][web:51][web:54]
]

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

CSRF_TRUSTED_ORIGINS = [
    "https://mflores.pythonanywhere.com",   # dominio de producción [web:41][web:52][web:55]
    "http://localhost:5173",                # para desarrollo con Vite
    "http://127.0.0.1:5173",
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
        "DIRS": ["/home/mflores/mi_jornada/templates",
                 ],
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

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static files (requerido en PythonAnywhere) ---

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")  # carpeta para collectstatic [web:40][web:46][web:47]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Integración frontend / email ---

FRONTEND_BASE_URL = os.environ.get(
    "FRONTEND_BASE_URL",
    "http://localhost:5173",  # por defecto, entorno de desarrollo
)

DEFAULT_FROM_EMAIL = "no-reply@mi-jornada.local"
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"