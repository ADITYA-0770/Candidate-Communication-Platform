from pathlib import Path
import os
import urllib.parse
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-production-candidate-platform-2026")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = ["*"]

GREEN_API_INSTANCE_ID = os.getenv("GREEN_API_INSTANCE_ID", "")
GREEN_API_TOKEN = os.getenv("GREEN_API_TOKEN", "")
GREEN_API_HOST = os.getenv("GREEN_API_HOST", "https://api.green-api.com")

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'candidates',
    'messaging',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

try:
    import whitenoise
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
except ImportError:
    pass

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://candidate-communication-platform.adityapradhan0770.workers.dev",
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

db_url = os.getenv("DATABASE_URL")
if db_url:
    parsed = urllib.parse.urlparse(db_url)
    db_name = parsed.path.lstrip("/")
    db_user = parsed.username
    db_pass = parsed.password
    db_host = parsed.hostname
    db_port = str(parsed.port or 5432)
    db_query = urllib.parse.parse_qs(parsed.query)
    sslmode = db_query.get("sslmode", [""])[0] or os.getenv("DB_SSLMODE", "")
else:
    db_name = os.getenv("DB_NAME", "")
    db_user = os.getenv("DB_USER", "")
    db_pass = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "")
    db_port = os.getenv("DB_PORT", "5432")
    sslmode = os.getenv("DB_SSLMODE", "")

db_options = {}
if not sslmode and db_host and "aivencloud.com" in db_host:
    sslmode = "require"
if sslmode:
    db_options["sslmode"] = sslmode
ca_path = BASE_DIR / "ca.pem"
if ca_path.exists():
    db_options["sslrootcert"] = str(ca_path)

if db_name and db_host:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": db_user,
            "PASSWORD": db_pass,
            "HOST": db_host,
            "PORT": db_port,
            "OPTIONS": db_options,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

try:
    import whitenoise
    STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
except ImportError:
    pass

MAILERS = {
    'default': {
        'BACKEND': 'django.core.mail.backends.console.EmailBackend',
    },
}
