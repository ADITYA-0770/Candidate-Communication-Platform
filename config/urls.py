import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
backend_dir = str(BASE_DIR / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.config.urls import urlpatterns
