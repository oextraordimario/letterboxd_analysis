"""Raspa os filmes da lista do clube e os dados de cada filme.

Saídas em data/raw/:
- fc_list.csv          posição na lista (= ordem em que assistimos) e nota do dono da lista
- fc_generaldata.csv   dados gerais por filme
- fc_cast.csv          elenco
- fc_crew.csv          equipe (diretor, roteirista, ...)
- fc_details.csv       estúdios, países e idiomas
- fc_genresthemes.csv  gêneros, temas e mini-temas

Uso: python -m pipeline.scrape_list [--refresh]
"""

import argparse
import json
import re

import pandas as pd

from pipeline import http
from pipeline.config import BASE_URL, LIST_PATH, RAW_DIR
from pipeline.io import write_csv


def scrape_list_entries() -> list[dict]:
    entries = []
    for soup in http.paginate(LIST_PATH):
        for li in soup.select("li.posteritem"):
            poster = li.select_one("[data-item-slug]")
            ident = json.loads(poster.get("data-postered-identifier", "{}"))
            owner_rating = li.get("data-owner-rating")
            entries.append(
                {
                    "position": len(entries) + 1,
                    "film_id": int(ident["uid"].split(":")[1]),
                    "film_slug": poster["data-item-slug"],
                    "film_name": poster.get("data-item-name", ""),
                    "owner_rating": int(owner_rating) / 2 if owner_rating not in (None, "", "0") else None,
                }
            )
    return entries


def _json_ld(soup) -> dict:
    tag = soup.find("script", type="application/ld+json")
    if not tag or not tag.string:
        return {}
    text = re.sub(r"/\*.*?\*/", "", tag.string, flags=re.S)
    return json.loads(text)


def _meta(soup, **attrs) -> str:
    tag = soup.find("meta", attrs=attrs)
    return tag["content"] if tag and tag.has_attr("content") else ""


def parse_film(soup, entry: dict) -> dict:
    film_id, slug = entry["film_id"], entry["film_slug"]
    ld = _json_ld(soup)
    title_el = soup.select_one("h1.primaryname .name") or soup.select_one("h1.primaryname")
    og_title = _meta(soup, property="og:title")
    short_title = title_el.get_text(strip=True) if title_el else og_title.split(" (")[0]

    footer = soup.find(class_="text-footer")
    footer_text = footer.get_text(" ", strip=True) if footer else ""
    duration = re.search(r"(\d+)\s*mins", footer_text)

    year = re.search(r"\((\d{4})\)", _meta(soup, name="twitter:title") or og_title)
    rating = ld.get("aggregateRating", {})

    imdb = soup.find("a", attrs={"data-track-action": "IMDb"})
    tmdb = soup.find("a", attrs={"data-track-action": "TMDB"}) or soup.find(
        "a", attrs={"data-track-action": "TMDb"}
    )
    body = soup.find("body")

    film = {
        "letterboxd_id": film_id,
        "letterboxd_shorttitle": short_title,
        "letterboxd_longtitle": og_title,
        "letterboxd_slug": slug,
        "letterboxd_url": f"{BASE_URL}/film/{slug}/",
        "imdb_url": imdb["href"] if imdb else "",
        "tmdb_url": tmdb["href"] if tmdb else "",
        "tmdb_id": body.get("data-tmdb-id", "") if body else "",
        "release_year": int(year.group(1)) if year else None,
        "duration": int(duration.group(1)) if duration else None,
        "avg_rating": rating.get("ratingValue"),
        "rating_count": rating.get("ratingCount"),
        "poster_url": ld.get("image", ""),
    }

    base = {"film_id": film_id, "film_title": short_title}

    cast = []
    cast_list = soup.find(class_="cast-list")
    for a in cast_list.find_all("a", class_="tooltip") if cast_list else []:
        cast.append(
            {"name": a.get_text(strip=True), "link": a["href"], "character_name": a.get("title"), **base}
        )

    crew = []
    panel = soup.find(id="tab-panel-crew")
    for a in panel.find_all("a", class_="text-slug") if panel else []:
        role = a["href"].strip("/").split("/")[0]
        crew.append({"name": a.get_text(strip=True), "role": role, "link": a["href"], **base})

    details = []
    panel = soup.find(id="tab-panel-details")
    for h3 in panel.find_all("h3") if panel else []:
        section = h3.get_text(" ", strip=True)
        sluglist = h3.find_next_sibling(class_="text-sluglist")
        for a in sluglist.find_all("a") if sluglist else []:
            href = a["href"]
            if href.startswith("/studio/"):
                key = "studio"
            elif href.startswith("/films/country/"):
                key = "country"
            elif href.startswith("/films/language/"):
                key = "language"
            else:
                key = "other"
            details.append(
                {"key": key, "section": section, "value": a.get_text(strip=True), "link": href, **base}
            )

    genres = []
    panel = soup.find(id="tab-panel-genres")
    for a in panel.find_all("a") if panel else []:
        kind = re.match(r"^/films/(genre|theme|mini-theme|nanogenre)/", a["href"])
        if kind:
            genres.append({"value": a.get_text(strip=True), "kind": kind.group(1), "link": a["href"], **base})

    return {"general": film, "cast": cast, "crew": crew, "details": details, "genres": genres}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="ignora o cache de HTML")
    args = parser.parse_args()
    http.refresh = args.refresh

    entries = scrape_list_entries()
    print(f"Lista: {len(entries)} filmes")
    write_csv(pd.DataFrame(entries), RAW_DIR / "fc_list.csv")

    tables = {"general": [], "cast": [], "crew": [], "details": [], "genres": []}
    for entry in entries:
        print(f"  [{entry['position']:>3}] {entry['film_name']}")
        soup = http.get_soup(f"/film/{entry['film_slug']}/")
        film = parse_film(soup, entry)
        tables["general"].append(film["general"])
        for key in ("cast", "crew", "details", "genres"):
            tables[key].extend(film[key])

    write_csv(pd.DataFrame(tables["general"]), RAW_DIR / "fc_generaldata.csv")
    write_csv(pd.DataFrame(tables["cast"]), RAW_DIR / "fc_cast.csv")
    write_csv(pd.DataFrame(tables["crew"]), RAW_DIR / "fc_crew.csv")
    write_csv(pd.DataFrame(tables["details"]), RAW_DIR / "fc_details.csv")
    write_csv(pd.DataFrame(tables["genres"]), RAW_DIR / "fc_genresthemes.csv")
    print("OK: data/raw/fc_*.csv")


if __name__ == "__main__":
    main()
