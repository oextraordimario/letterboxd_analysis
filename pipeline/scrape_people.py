"""Raspa a foto (TMDB, via página do Letterboxd) das pessoas mais frequentes da lista.

Pega atores com 3+ filmes, diretores/roteiristas com 2+ filmes e os destaques de equipe
de CREW_ROLES (mesmos cortes das análises). Rode scrape_list antes.

Saída: data/raw/fc_people.csv (link, nome, papel, url da foto)

Uso: python -m pipeline.scrape_people [--refresh]
"""

import argparse

import pandas as pd

from pipeline import http
from pipeline.config import CREW_ROLES, RAW_DIR
from pipeline.io import read_csv, write_csv

MIN_FILMS = {"actor": 3, "director": 2, "writer": 2}


def frequent_people() -> pd.DataFrame:
    cast = read_csv(RAW_DIR / "fc_cast.csv").assign(role="actor")
    crew = read_csv(RAW_DIR / "fc_crew.csv")
    people = pd.concat([cast, crew[crew["role"].isin(["director", "writer"])]])
    counts = (
        people.drop_duplicates(["link", "role", "film_id"])
        .groupby(["link", "name", "role"])
        .size()
        .reset_index(name="movie_count")
    )
    counts = counts[counts["movie_count"] >= counts["role"].map(MIN_FILMS)]
    return pd.concat([counts, crew_highlights(crew)]).drop_duplicates("link")


def crew_highlights(crew: pd.DataFrame) -> pd.DataFrame:
    """Quem mais aparece em cada função de CREW_ROLES (2+ filmes; empates, até 3)."""
    tops = []
    for role in CREW_ROLES:
        counts = (
            crew[crew["role"] == role].drop_duplicates(["link", "film_id"])
            .groupby(["link", "name"]).size().reset_index(name="movie_count")
            .query("movie_count >= 2")
            .sort_values(["movie_count", "name"], ascending=[False, True])
        )
        if not counts.empty:
            tops.append(counts[counts["movie_count"] == counts["movie_count"].max()].head(3).assign(role=role))
    return pd.concat(tops) if tops else pd.DataFrame()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="ignora o cache de HTML")
    args = parser.parse_args()
    http.refresh = args.refresh

    people = frequent_people()
    print(f"{len(people)} pessoas")
    rows = []
    for _, p in people.iterrows():
        soup = http.get_soup(p["link"])
        img = soup.select_one("img.js-tmdb-person[data-image]") if soup else None
        rows.append(
            {"link": p["link"], "name": p["name"], "role": p["role"], "image_url": img["data-image"] if img else ""}
        )
    df = pd.DataFrame(rows)
    write_csv(df, RAW_DIR / "fc_people.csv")
    print(f"OK: data/raw/fc_people.csv ({(df['image_url'] != '').sum()} com foto)")


if __name__ == "__main__":
    main()
