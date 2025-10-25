from datetime import timedelta
from pathlib import Path
import os

# =====================================================
# 🔹 BASE SETTINGS
# =====================================================
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-qa3x*-zeg(pl8xeocv+w8ewk&xi(ps7!+v78usk8-e76yc!#4%"
DEBUG = True

ALLOWED_HOSTS = ["*"]  # ⚠️ Solo per sviluppo — specifica domini in produzione


# =====================================================
# 🔹 INSTALLED APPS
# =====================================================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",

    # Local apps
    "ideas",
]


# =====================================================
# 🔹 REST FRAMEWORK + JWT CONFIG
# =====================================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}


# =====================================================
# 🔹 MIDDLEWARE
# =====================================================
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # deve stare prima del CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =====================================================
# 🔹 CORS (dev)
# =====================================================
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# =====================================================
# 🔹 DATABASE
# =====================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "mindlink_db",
        "USER": "postgres",
        "PASSWORD": "0000",
        "HOST": "localhost",
        "PORT": "5432",
    }
}


# =====================================================
# 🔹 TEMPLATES / WSGI / URLS
# =====================================================
ROOT_URLCONF = "mindlink_core.urls"
WSGI_APPLICATION = "mindlink_core.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
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


# =====================================================
# 🔹 PASSWORD VALIDATION
# =====================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# =====================================================
# 🔹 I18N / TZ / STATIC
# =====================================================
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Europe/Rome"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =====================================================
# 🔹 LOGGING CONFIGURATION
# =====================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "[%(asctime)s] %(levelname)s — %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
        "file": {
            "class": "logging.FileHandler",
            "filename": os.path.join(BASE_DIR, "mindlink.log"),
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO"},
        "ideas": {"handlers": ["file", "console"], "level": "INFO"},
    },
}


# =====================================================
# 🔹 MINDLINK AI CONFIGURATION
# =====================================================
MINDLINK_TRAIN = {
    "BATCH_SIZE": 8,
    "EPOCHS": 1,
    "TOP_K": 5,
    "STRONG_THR": 0.85,
    "WEAK_THR": 0.6,
}
