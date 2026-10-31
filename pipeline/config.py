"""Configuração do pipeline: lista, membros e caminhos."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = REPO_ROOT / "data" / "raw"
ANALYTICS_DIR = REPO_ROOT / "data" / "analytics"
CACHE_DIR = RAW_DIR / "_cache"

BASE_URL = "https://letterboxd.com"
LIST_OWNER = "dromemario"
LIST_SLUG = "fff-familia-fa-de-filmes"
LIST_PATH = f"/{LIST_OWNER}/list/{LIST_SLUG}/"

# Membros do grupo = dono da lista + quem curtiu a lista + EXTRA_MEMBERS - EXCLUDED_MEMBERS.
EXTRA_MEMBERS = ["zafrina"]
EXCLUDED_MEMBERS: list[str] = []

# Último filme da lista mostrado na apresentação de nov/2024 (posição 70).
LAST_PRESENTED_SLUG = "fallen-angels"

# Mínimo de membros com nota para um filme entrar na análise de divergência.
MIN_VOTERS = 3

# Pausa entre requisições ao Letterboxd (segundos). Páginas em cache não esperam.
REQUEST_DELAY = 1.0

# Funções de equipe destacadas no slide "Bastidores", na ordem de exibição
# (quem mais aparece em cada uma; empates juntos, até 3). Usado em scrape_people e build_analytics.
CREW_ROLES = [
    "editor", "cinematography", "composer", "costume-design", "makeup", "hairstyling",
    "production-design", "casting", "visual-effects", "stunts", "sound",
]
