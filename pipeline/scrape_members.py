"""Raspa os membros do grupo, as notas de cada um e as datas do diário do dono da lista.

Membros = dono da lista + quem curtiu a lista + EXTRA_MEMBERS - EXCLUDED_MEMBERS
(ver pipeline/config.py).

Saídas em data/raw/ (só filmes da lista; rode scrape_list antes):
- fc_members.csv        username, nome de exibição, origem (owner/like/extra) e avatar
- fc_member_films.csv   filmes da lista que cada membro marcou como visto, com a nota (0,5–5, vazia se
                        não avaliou) e se curtiu (liked 1/0)
- fc_owner_diary.csv    entradas do diário do dono da lista (data, nota, se foi revisão)

Uso: python -m pipeline.scrape_members [--refresh]
"""

import argparse
import re

import pandas as pd

from pipeline import http
from pipeline.config import EXCLUDED_MEMBERS, EXTRA_MEMBERS, LIST_OWNER, LIST_PATH, RAW_DIR
from pipeline.io import read_csv, write_csv


def scrape_members() -> list[dict]:
    members = [{"username": LIST_OWNER, "source": "owner"}]
    for soup in http.paginate(f"{LIST_PATH}likes/"):
        for a in soup.select("a.name"):
            username = a["href"].strip("/")
            if "/" not in username:
                members.append({"username": username, "source": "like"})
    members += [{"username": u, "source": "extra"} for u in EXTRA_MEMBERS]

    seen, result = set(), []
    for m in members:
        if m["username"] in seen or m["username"] in EXCLUDED_MEMBERS:
            continue
        seen.add(m["username"])
        profile = http.get_soup(f"/{m['username']}/")
        og = profile.find("meta", property="og:title") if profile else None
        display = og["content"].replace("’s profile", "").strip() if og else m["username"]
        avatar = profile.select_one("span.avatar.-large img") if profile else None
        result.append(
            {
                "username": m["username"],
                "display_name": display,
                "source": m["source"],
                "avatar_url": avatar["src"] if avatar else "",
            }
        )
    return result


def scrape_member_films(username: str, list_slugs: set[str]) -> list[dict]:
    rows = []
    for soup in http.paginate(f"/{username}/films/"):
        for li in soup.select("li.griditem"):
            poster = li.select_one("[data-item-slug]")
            slug = poster["data-item-slug"] if poster else None
            if slug not in list_slugs:
                continue
            rating_el = li.select_one("span.rating")
            rated = re.search(r"rated-(\d+)", " ".join(rating_el["class"])) if rating_el else None
            rows.append(
                {
                    "username": username,
                    "film_slug": slug,
                    "rating": int(rated.group(1)) / 2 if rated else None,
                    "liked": int(li.select_one("span.like.icon-liked") is not None),
                }
            )
    return rows


def scrape_diary(username: str, list_slugs: set[str]) -> list[dict]:
    rows = []
    for soup in http.paginate(f"/{username}/films/diary/"):
        for tr in soup.select("tr.diary-entry-row"):
            poster = tr.select_one("[data-item-slug]")
            slug = poster["data-item-slug"] if poster else None
            if slug not in list_slugs:
                continue
            day = tr.select_one("a.daydate")
            date = re.search(r"/for/(\d{4})/(\d{2})/(\d{2})/", day["href"]) if day else None
            rating = tr.select_one("input.rateit-field")
            rewatch = tr.select_one("td.col-rewatch")
            rows.append(
                {
                    "username": username,
                    "film_slug": slug,
                    "watched_date": "-".join(date.groups()) if date else None,
                    "rating": int(rating["value"]) / 2 if rating and rating.get("value") not in (None, "", "0") else None,
                    "rewatch": bool(rewatch) and "icon-status-off" not in rewatch.get("class", []),
                }
            )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="ignora o cache de HTML")
    args = parser.parse_args()
    http.refresh = args.refresh

    list_slugs = set(read_csv(RAW_DIR / "fc_list.csv")["film_slug"])

    members = scrape_members()
    print("Membros:", ", ".join(f"{m['username']} ({m['source']})" for m in members))
    write_csv(pd.DataFrame(members), RAW_DIR / "fc_members.csv")

    films = []
    for m in members:
        rows = scrape_member_films(m["username"], list_slugs)
        rated = sum(r["rating"] is not None for r in rows)
        liked = sum(r["liked"] for r in rows)
        print(f"  {m['username']}: {len(rows)} filmes da lista vistos, {rated} com nota, {liked} curtidos")
        films += rows
    write_csv(pd.DataFrame(films, columns=["username", "film_slug", "rating", "liked"]), RAW_DIR / "fc_member_films.csv")

    diary = scrape_diary(LIST_OWNER, list_slugs)
    print(f"Diário de {LIST_OWNER}: {len(diary)} entradas de filmes da lista")
    write_csv(pd.DataFrame(diary), RAW_DIR / "fc_owner_diary.csv")
    print("OK: data/raw/fc_members.csv, fc_member_films.csv, fc_owner_diary.csv")


if __name__ == "__main__":
    main()
