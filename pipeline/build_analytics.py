"""Gera as análises a partir de data/raw/ e grava em data/analytics/.

- fc_*.csv     tabelas analíticas (uma por análise)
- report.json  tudo o que o relatório em Next (web/) consome

Uso: python -m pipeline.build_analytics
"""

import json
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd

from pipeline.config import ANALYTICS_DIR, BASE_URL, LAST_PRESENTED_SLUG, LIST_PATH, MIN_VOTERS, RAW_DIR
from pipeline.io import read_csv, write_csv

THEME_KINDS = ["theme", "mini-theme"]


def load_raw() -> dict[str, pd.DataFrame]:
    names = [
        "list", "generaldata", "cast", "crew", "details", "genresthemes",
        "members", "member_films", "owner_diary", "people",
    ]
    return {n: read_csv(RAW_DIR / f"fc_{n}.csv") for n in names}


# --- Datas -------------------------------------------------------------------

def club_watch_dates(lst: pd.DataFrame, diary: pd.DataFrame) -> pd.Series:
    """Data da sessão do clube para cada filme (índice = film_slug).

    Filmes com uma entrada no diário usam essa data. Com várias (revisões solo),
    escolhe a mais próxima da mediana das datas dos vizinhos na lista (±5 posições),
    já que a lista segue, com poucas exceções, a ordem em que assistimos.
    """
    dates = diary.dropna(subset=["watched_date"]).assign(
        d=lambda df: pd.to_datetime(df["watched_date"]).map(date.toordinal)
    )
    by_slug = dates.groupby("film_slug")["d"].apply(list).to_dict()
    pos = lst.set_index("film_slug")["position"]
    single = {s: v[0] for s, v in by_slug.items() if len(v) == 1}

    result = {}
    for slug, p in pos.items():
        options = by_slug.get(slug)
        if not options:
            continue
        if len(options) == 1:
            result[slug] = options[0]
            continue
        neighbors = [single[s] for s, q in pos.items() if s in single and s != slug and abs(q - p) <= 5]
        target = np.median(neighbors) if neighbors else min(options)
        result[slug] = min(options, key=lambda o: abs(o - target))
    return pd.Series({s: date.fromordinal(int(o)).isoformat() for s, o in result.items()}, name="watched_date")


# --- Análises legadas ----------------------------------------------------------

def main_metrics(films: pd.DataFrame) -> dict:
    total = int(films["duration"].sum())
    longest = films.loc[films["duration"].idxmax()]
    shortest = films.loc[films["duration"].idxmin()]
    best = films.loc[films["avg_rating"].idxmax()]
    worst = films.loc[films["avg_rating"].idxmin()]
    return {
        "movies_watched": len(films),
        "minutes_watched": total,
        "hours_watched": round(total / 60, 2),
        "days_watched": round(total / 60 / 24, 2),
        "avg_movie_length": round(float(films["duration"].mean()), 2),
        "name_longest_movie": longest["title"],
        "duration_longest_movie": int(longest["duration"]),
        "name_shortest_movie": shortest["title"],
        "duration_shortest_movie": int(shortest["duration"]),
        "avg_lbxd_rating": round(float(films["avg_rating"].mean()), 2),
        "best_lbxd_rating": best["title"],
        "best_lbxd_rating_value": float(best["avg_rating"]),
        "worst_lbxd_rating": worst["title"],
        "worst_lbxd_rating_value": float(worst["avg_rating"]),
    }


def movies_per_decade(films: pd.DataFrame) -> pd.DataFrame:
    decade = (films["release_year"] // 10) * 10
    counts = decade.value_counts()
    all_decades = range(int(decade.min()), int(decade.max()) + 10, 10)
    return pd.DataFrame(
        {"release_decade": list(all_decades), "movie_count": [int(counts.get(d, 0)) for d in all_decades]}
    )


def popular_people(people: pd.DataFrame, min_films: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Pessoas com min_films+ filmes e a lista de filmes de cada uma."""
    people = people.drop_duplicates(["link", "film_id"])
    counts = (
        people.groupby(["link", "name"]).size().reset_index(name="movie_count")
        .query("movie_count >= @min_films")
        .sort_values(["movie_count", "name"], ascending=[False, True])
        .reset_index(drop=True)
    )
    movies = (
        people[people["link"].isin(counts["link"])][["name", "link", "film_title"]]
        .sort_values(["name", "film_title"])
        .reset_index(drop=True)
    )
    return counts[["name", "movie_count", "link"]], movies


def count_by(details: pd.DataFrame, key: str, min_count: int = 1) -> pd.DataFrame:
    sub = details[details["key"] == key].drop_duplicates(["film_id", "link"])
    return (
        sub.groupby("value").size().reset_index(name="movie_count")
        .rename(columns={"value": key})
        .query("movie_count >= @min_count")
        .sort_values(["movie_count", key], ascending=[False, True])
        .reset_index(drop=True)
    )


def genre_tables(gt: pd.DataFrame) -> dict[str, pd.DataFrame]:
    genres = gt[gt["kind"] == "genre"].drop_duplicates(["film_id", "value"])
    primary = genres.groupby("film_id").head(1)
    themes = gt[gt["kind"].isin(THEME_KINDS)].drop_duplicates(["film_id", "value"])

    def count(df, col):
        return (
            df.groupby("value").size().reset_index(name="movie_count").rename(columns={"value": col})
            .sort_values(["movie_count", col], ascending=[False, True]).reset_index(drop=True)
        )

    return {
        "popular_complete_genres": count(genres, "genre"),
        "popular_primary_genres": count(primary, "genre"),
        "popular_themes": count(themes, "theme"),
    }


# --- Análises novas: notas do grupo ------------------------------------------

def group_ratings(films: pd.DataFrame, ratings: pd.DataFrame, members: list[str]) -> pd.DataFrame:
    wide = ratings.pivot_table(index="film_slug", columns="username", values="rating")
    wide = wide.reindex(columns=members)
    out = films[["position", "film_slug", "title", "release_year", "avg_rating"]].set_index("film_slug")
    out = out.join(wide)
    out["group_avg"] = wide.mean(axis=1).round(2)
    out["group_voters"] = wide.notna().sum(axis=1).reindex(out.index).fillna(0).astype(int)
    out["group_std"] = wide.std(axis=1, ddof=0).round(2)
    out.loc[out["group_voters"] < 2, "group_std"] = np.nan
    out["diff_vs_lbxd"] = (out["group_avg"] - out["avg_rating"]).round(2)
    return out.reset_index().sort_values("position").reset_index(drop=True)


def member_stats(gr: pd.DataFrame, seen: pd.DataFrame, members: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, m in members.iterrows():
        u = m["username"]
        rated = gr[gr[u].notna()]
        others = gr.drop(columns=[u])[[c for c in members["username"] if c != u]]
        others_mean = others.mean(axis=1)
        mask = gr[u].notna() & others_mean.notna()
        top = rated.sort_values([u, "avg_rating"], ascending=[False, False]).head(1)
        bottom = rated.sort_values([u, "avg_rating"], ascending=[True, True]).head(1)
        rows.append(
            {
                "username": u,
                "display_name": m["display_name"],
                "films_seen": int((seen["username"] == u).sum()),
                "films_rated": len(rated),
                "avg_rating": round(float(rated[u].mean()), 2) if len(rated) else None,
                "avg_diff_vs_lbxd": round(float((rated[u] - rated["avg_rating"]).mean()), 2) if len(rated) else None,
                "avg_diff_vs_group": round(float((gr.loc[mask, u] - others_mean[mask]).mean()), 2) if mask.any() else None,
                "favorite_film": top["title"].iloc[0] if len(top) else None,
                "favorite_rating": float(top[u].iloc[0]) if len(top) else None,
                "least_favorite_film": bottom["title"].iloc[0] if len(bottom) else None,
                "least_favorite_rating": float(bottom[u].iloc[0]) if len(bottom) else None,
            }
        )
    return pd.DataFrame(rows)


def affinity(gr: pd.DataFrame, members: list[str], min_common: int = 10) -> pd.DataFrame:
    """Diferença média absoluta de nota entre cada par, nos filmes que ambos avaliaram."""
    rows = []
    for i, a in enumerate(members):
        for b in members[i + 1:]:
            both = gr[gr[a].notna() & gr[b].notna()]
            if len(both) < min_common:
                continue
            rows.append(
                {
                    "member_a": a,
                    "member_b": b,
                    "common_films": len(both),
                    "mean_abs_diff": round(float((both[a] - both[b]).abs().mean()), 2),
                }
            )
    return pd.DataFrame(rows).sort_values("mean_abs_diff").reset_index(drop=True)


# --- Montagem ------------------------------------------------------------------

def records(df: pd.DataFrame) -> list[dict]:
    return json.loads(df.to_json(orient="records", force_ascii=False))


def build() -> None:
    raw = load_raw()
    lst, gd = raw["list"], raw["generaldata"]
    members = raw["members"]
    member_names = list(members["username"])

    films = lst[["position", "film_slug"]].merge(
        gd.rename(columns={"letterboxd_slug": "film_slug", "letterboxd_shorttitle": "title"}), on="film_slug"
    )
    films = films.sort_values("position").reset_index(drop=True)
    films["watched_date"] = films["film_slug"].map(club_watch_dates(lst, raw["owner_diary"]))
    cutoff = int(lst.loc[lst["film_slug"] == LAST_PRESENTED_SLUG, "position"].iloc[0])
    films["presented"] = films["position"] <= cutoff

    analytics: dict[str, pd.DataFrame] = {}
    metrics = main_metrics(films)
    # Idade do clube: da primeira sessão até hoje.
    start = pd.Timestamp(films["watched_date"].min())
    today = pd.Timestamp(date.today())
    months = (today.year - start.year) * 12 + (today.month - start.month) - (today.day < start.day)
    metrics["club_start"] = start.date().isoformat()
    metrics["club_age_months"] = int(months)
    metrics["films_per_month"] = round(len(films) / ((today - start).days / (365.25 / 12)), 2)
    analytics["main_metrics"] = pd.DataFrame([metrics])
    analytics["movies_per_release_decade"] = movies_per_decade(films)

    people_img = raw["people"].fillna({"image_url": ""}).set_index("link")["image_url"].to_dict()
    cast, crew = raw["cast"], raw["crew"]
    person_sections = {}
    for role, df, min_films in [
        ("actors", cast, 3),
        ("directors", crew[crew["role"] == "director"], 2),
        ("writers", crew[crew["role"] == "writer"], 2),
    ]:
        counts, movies = popular_people(df, min_films)
        analytics[f"popular_{role}"] = counts
        analytics[f"popular_{role}_movies"] = movies
        person_sections[role] = [
            {
                **p,
                "url": BASE_URL + p["link"],
                "image_url": people_img.get(p["link"]) or None,
                "films": movies.loc[movies["link"] == p["link"], "film_title"].tolist(),
            }
            for p in records(counts)
        ]

    details = raw["details"]
    analytics["movies_per_country"] = count_by(details, "country")
    analytics["movies_per_language"] = count_by(details, "language")
    analytics["movies_per_studio"] = count_by(details, "studio", min_count=3)
    analytics.update(genre_tables(raw["genresthemes"]))

    seen = raw["member_films"]
    ratings = seen.dropna(subset=["rating"])
    gr = group_ratings(films, ratings, member_names)
    analytics["group_ratings"] = gr
    analytics["member_stats"] = member_stats(gr, seen, members).merge(
        members[["username", "avatar_url"]].fillna({"avatar_url": ""}), on="username"
    )
    analytics["member_affinity"] = affinity(gr, member_names)

    # Curtidas (coração) dos membros nos filmes da lista.
    likes = seen[(seen["liked"] == 1) & seen["username"].isin(member_names)]
    liked_by = likes.groupby("film_slug")["username"].agg(list)
    analytics["member_stats"]["films_liked"] = (
        analytics["member_stats"]["username"].map(likes["username"].value_counts()).fillna(0).astype(int)
    )
    film_likes = films[["position", "film_slug", "title"]].copy()
    film_likes["like_count"] = film_likes["film_slug"].map(liked_by.str.len()).fillna(0).astype(int)
    film_likes["liked_by"] = film_likes["film_slug"].map(liked_by.str.join(",")).fillna("")
    analytics["film_likes"] = film_likes

    eligible = gr[gr["group_voters"] >= MIN_VOTERS]
    analytics["divergence_liked_more"] = eligible.sort_values("diff_vs_lbxd", ascending=False).head(10)
    analytics["divergence_liked_less"] = eligible.sort_values("diff_vs_lbxd").head(10)
    analytics["group_splits"] = eligible.dropna(subset=["group_std"]).sort_values("group_std", ascending=False).head(10)

    new = films[~films["presented"]]
    analytics["since_last_presentation"] = new[["position", "title", "release_year", "duration", "watched_date"]]

    watched = pd.to_datetime(films["watched_date"])
    analytics["movies_per_year_watched"] = (
        watched.dt.year.value_counts().sort_index().rename_axis("year").reset_index(name="movie_count")
    )

    ANALYTICS_DIR.mkdir(parents=True, exist_ok=True)
    for name, df in analytics.items():
        write_csv(df, ANALYTICS_DIR / f"fc_{name}.csv")

    gr_idx = gr.set_index("film_slug")
    film_records = []
    for f in records(films):
        g = gr_idx.loc[f["film_slug"]]
        film_records.append(
            {
                "position": f["position"],
                "slug": f["film_slug"],
                "title": f["title"],
                "year": f["release_year"],
                "duration": f["duration"],
                "url": f["letterboxd_url"],
                "poster_url": f["poster_url"] if isinstance(f["poster_url"], str) and f["poster_url"] else None,
                "lbxd_avg": f["avg_rating"],
                "lbxd_rating_count": f["rating_count"],
                "watched_date": f["watched_date"],
                "presented": f["presented"],
                "ratings": {u: (None if pd.isna(g[u]) else float(g[u])) for u in member_names},
                "group_avg": None if pd.isna(g["group_avg"]) else float(g["group_avg"]),
                "group_voters": int(g["group_voters"]),
                "group_std": None if pd.isna(g["group_std"]) else float(g["group_std"]),
                "diff_vs_lbxd": None if pd.isna(g["diff_vs_lbxd"]) else float(g["diff_vs_lbxd"]),
                "liked_by": liked_by.get(f["film_slug"], []),
                "like_count": len(liked_by.get(f["film_slug"], [])),
            }
        )

    slugs = lambda df: df["film_slug"].tolist()  # noqa: E731
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "list_url": BASE_URL + LIST_PATH,
        "min_voters": MIN_VOTERS,
        "last_presented": {"position": cutoff, "title": films.loc[cutoff - 1, "title"]},
        "metrics": metrics,
        "since_last_presentation": {
            **main_metrics(new),
            "first_date": new["watched_date"].min(),
            "last_date": new["watched_date"].max(),
        },
        "members": records(analytics["member_stats"]),
        "affinity": records(analytics["member_affinity"]),
        "films": film_records,
        "divergence": {
            "liked_more": slugs(analytics["divergence_liked_more"]),
            "liked_less": slugs(analytics["divergence_liked_less"]),
            "splits": slugs(analytics["group_splits"]),
        },
        "group_avg_overall": round(float(eligible["group_avg"].mean()), 2),
        "lbxd_avg_overall_eligible": round(float(eligible["avg_rating"].mean()), 2),
        "decades": records(analytics["movies_per_release_decade"]),
        "years_watched": records(analytics["movies_per_year_watched"]),
        "people": person_sections,
        "countries": records(analytics["movies_per_country"]),
        "languages": records(analytics["movies_per_language"]),
        "studios": records(analytics["movies_per_studio"]),
        "genres_all": records(analytics["popular_complete_genres"]),
        "genres_primary": records(analytics["popular_primary_genres"]),
        "themes": records(analytics["popular_themes"].head(20)),
    }
    (ANALYTICS_DIR / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1, allow_nan=False), encoding="utf-8")
    print(f"OK: {len(analytics)} tabelas em data/analytics/ + report.json")


if __name__ == "__main__":
    build()
