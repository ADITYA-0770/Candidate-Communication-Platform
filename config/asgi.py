import os
import sys
from pathlib import Path
from django.core.asgi import get_asgi_application

BASE_DIR = Path(__file__).resolve().parent.parent
backend_dir = str(BASE_DIR / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()

