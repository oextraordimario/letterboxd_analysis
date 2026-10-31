"""Download de páginas do Letterboxd com pausa entre requisições e cache em disco."""

import hashlib
import time

from bs4 import BeautifulSoup
from curl_cffi import requests

from pipeline.config import BASE_URL, CACHE_DIR, REQUEST_DELAY

# O Cloudflare do Letterboxd barra o TLS do `requests` em algumas páginas;
# o curl_cffi se apresenta como o Chrome.
_session = requests.Session(impersonate="chrome")
_last_request = 0.0

# Com refresh=True o cache é ignorado (e regravado) na execução atual.
refresh = False


def _cache_path(path: str):
    name = path.strip("/").replace("/", "__") or "root"
    if len(name) > 150:
        name = name[:100] + "_" + hashlib.md5(name.encode()).hexdigest()
    return CACHE_DIR / f"{name}.html"


def get_html(path: str) -> str | None:
    """Retorna o HTML de `path` (relativo a letterboxd.com) ou None em 404."""
    global _last_request
    cache = _cache_path(path)
    if cache.exists() and not refresh:
        return cache.read_text(encoding="utf-8")

    wait = REQUEST_DELAY - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)

    for attempt in range(4):
        resp = _session.get(BASE_URL + path, timeout=30)
        _last_request = time.monotonic()
        if resp.status_code == 404:
            return None
        if resp.status_code in (403, 429, 500, 502, 503):
            time.sleep(5 * (attempt + 1))
            continue
        resp.raise_for_status()
        break
    else:
        resp.raise_for_status()

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(resp.text, encoding="utf-8")
    return resp.text


def get_soup(path: str) -> BeautifulSoup | None:
    html = get_html(path)
    return BeautifulSoup(html, "html.parser") if html is not None else None


def paginate(path: str):
    """Itera sobre `path`, `path/page/2/`, ... enquanto houver próxima página."""
    page = 1
    while True:
        soup = get_soup(path if page == 1 else f"{path}page/{page}/")
        if soup is None:
            return
        yield soup
        if not soup.select_one("a.next"):
            return
        page += 1
