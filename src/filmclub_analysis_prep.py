from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd


ANALYSIS_CSVS = [
    "fc_main_metrics.csv",
    "fc_movies_per_release_decade.csv",
    "fc_popular_actors.csv",
    "fc_popular_actors_movies.csv",
    "fc_popular_directors.csv",
    "fc_popular_directors_movies.csv",
    "fc_popular_writers.csv",
    "fc_popular_writers_movies.csv",
    "fc_movies_per_country.csv",
    "fc_movies_per_language.csv",
    "fc_movies_per_studio.csv",
    "fc_popular_complete_genres.csv",
    "fc_popular_primary_genres.csv",
    "fc_popular_themes.csv",
]


def _read_csv(input_dir: Path, name: str) -> pd.DataFrame:
    return pd.read_csv(input_dir / name, sep=";")


def load_raw_data(input_dir: Path) -> dict[str, pd.DataFrame]:
    return {
        "gdata": _read_csv(input_dir, "fc_generaldata.csv"),
        "cast": _read_csv(input_dir, "fc_cast.csv"),
        "crew": _read_csv(input_dir, "fc_crew.csv"),
        "details": _read_csv(input_dir, "fc_details.csv"),
        "gthemes": _read_csv(input_dir, "fc_genresthemes.csv"),
    }


def build_analytical_dataframes(raw: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    df_gdata = raw["gdata"].copy()
    df_cast = raw["cast"].copy()
    df_crew = raw["crew"].copy()
    df_details = raw["details"].copy()
    df_gthemes = raw["gthemes"].copy()

    # Keep compatibility with legacy column name "0".
    if "value" not in df_gthemes.columns and "0" in df_gthemes.columns:
        df_gthemes = df_gthemes.rename(columns={"0": "value"})

    analytical = {}

    df_gdata["release_decade"] = (df_gdata["release_year"] // 10) * 10

    median_rating = df_gdata["avg_rating"].median()
    _ = df_gdata.iloc[(df_gdata["avg_rating"] - median_rating).abs().idxmin()]

    main_metrics_dict = {
        "movies_watched": len(df_gdata),
        "minutes_watched": int(df_gdata["duration"].sum()),
        "hours_watched": float((df_gdata["duration"].sum() / 60).round(2)),
        "days_watched": float(((df_gdata["duration"].sum() / 60) / 24).round(2)),
        "avg_movie_length": float(df_gdata["duration"].mean().round(2)),
        "name_longest_movie": df_gdata.loc[df_gdata["duration"].idxmax()][
            "letterboxd_shorttitle"
        ],
        "duration_longest_movie": int(df_gdata["duration"].max().round(2)),
        "name_shortest_movie": df_gdata.loc[df_gdata["duration"].idxmin()][
            "letterboxd_shorttitle"
        ],
        "duration_shortest_movie": int(df_gdata["duration"].min().round(2)),
        "avg_lbxd_rating": float(df_gdata["avg_rating"].mean().round(2)),
        "best_lbxd_rating": df_gdata.loc[df_gdata["avg_rating"].idxmax()][
            "letterboxd_shorttitle"
        ],
        "worst_lbxd_rating": df_gdata.loc[df_gdata["avg_rating"].idxmin()][
            "letterboxd_shorttitle"
        ],
    }

    analytical["main_metrics"] = pd.DataFrame([main_metrics_dict])

    adf_moviesperdecade = (
        df_gdata.groupby("release_decade")[["letterboxd_id"]]
        .count()
        .reset_index()
        .rename(columns={"letterboxd_id": "movie_count"})
    )
    missing_decades = pd.DataFrame({"release_decade": [1930], "movie_count": [0]})

    analytical["movies_per_release_decade"] = (
        pd.concat([adf_moviesperdecade, missing_decades])
        .sort_values("release_decade")
        .reset_index(drop=True)
    )

    analytical["popular_actors"] = (
        df_cast.groupby(["link", "name"])[["film_id"]]
        .count()
        .reset_index()
        .rename(columns={"film_id": "movie_count"})
        .sort_values("movie_count", ascending=False)
        .query(" movie_count > 2 ")
        .reset_index(drop=True)
    )[["name", "movie_count", "link"]]

    most_popular_actors = list(analytical["popular_actors"]["name"])

    analytical["popular_actors_movies"] = (
        df_cast[["name", "film_title"]]
        .loc[df_cast["name"].isin(most_popular_actors)]
        .sort_values(["name", "film_title"], ascending=[False, True])
        .reset_index(drop=True)
    )

    adf_crew_moviesperrole = (
        df_crew.groupby(["link", "name", "role"])[["film_id"]]
        .count()
        .reset_index()
        .rename(columns={"film_id": "movie_count"})
        .sort_values(["role", "movie_count"], ascending=[True, False])
        .query(" movie_count > 1 ")
        .reset_index(drop=True)
    )[["name", "role", "movie_count", "link"]]

    main_roles = ["director", "writer"]

    for role in main_roles:
        analytical[f"popular_{role}s"] = adf_crew_moviesperrole.query(
            f" role == '{role}' "
        ).drop(columns="role")

        most_popular_in_role = list(analytical[f"popular_{role}s"]["name"])

        analytical[f"popular_{role}s_movies"] = (
            df_crew[["name", "role", "film_title"]]
            .loc[df_crew["name"].isin(most_popular_in_role)]
            .query(f" role == '{role}' ")
            .sort_values(["name", "film_title"], ascending=[False, True])
            .drop(columns="role")
            .reset_index(drop=True)
        )

    df_details = df_details.drop_duplicates(
        subset=["film_id", "film_title", "key", "value", "link"], keep="first"
    ).reset_index(drop=True)

    df_details["movie_count"] = df_details.groupby("link")["link"].transform("count")

    df_studios = (
        df_details.loc[df_details["key"] == "studio"]
        .sort_values(["movie_count", "value"], ascending=False)
        .rename(columns={"value": "studio"})
    )

    df_countries = (
        df_details.loc[df_details["key"] == "country"]
        .sort_values(["movie_count", "value"], ascending=False)
        .rename(columns={"value": "country"})
    )

    df_languages = (
        df_details.loc[df_details["key"] == "language"]
        .sort_values(["movie_count", "value"], ascending=False)
        .rename(columns={"value": "language"})
    )

    analytical["movies_per_country"] = (
        df_countries.groupby("country")[["movie_count"]]
        .max()
        .reset_index()
        .sort_values("movie_count", ascending=False)
        .reset_index(drop=True)
    )

    analytical["movies_per_language"] = (
        df_languages.groupby("language")[["movie_count"]]
        .max()
        .reset_index()
        .sort_values("movie_count", ascending=False)
        .reset_index(drop=True)
    )

    analytical["movies_per_studio"] = (
        df_studios.groupby("studio")[["movie_count"]]
        .max()
        .reset_index()
        .query(" movie_count > 2 ")
        .sort_values("movie_count", ascending=False)
        .reset_index(drop=True)
    )

    df_gthemes["movie_count"] = df_gthemes.groupby("value")["value"].transform("count")

    genres = [
        "Adventure",
        "Family",
        "Drama",
        "Comedy",
        "Fantasy",
        "Action",
        "Horror",
        "Mystery",
        "Thriller",
        "Science Fiction",
        "Crime",
        "Western",
        "Animation",
        "History",
        "Romance",
        "Music",
    ]

    df_genres = df_gthemes.loc[df_gthemes["value"].isin(genres)].rename(
        columns={"value": "genre"}
    )
    df_themes = df_gthemes.loc[~df_gthemes["value"].isin(genres)].rename(
        columns={"value": "theme"}
    )

    df_genres["primary_genre"] = df_genres.groupby("film_title").cumcount() == 0
    df_themes["primary_theme"] = df_themes.groupby("film_title").cumcount() == 0

    analytical["popular_complete_genres"] = (
        df_genres.groupby("genre")[["film_title"]]
        .count()
        .reset_index()
        .sort_values("film_title", ascending=False)
        .reset_index(drop=True)
    )

    analytical["popular_primary_genres"] = (
        df_genres.query(" primary_genre == True ")
        .groupby("genre")[["film_title"]]
        .count()
        .reset_index()
        .sort_values("film_title", ascending=False)
        .reset_index(drop=True)
    )

    analytical["popular_themes"] = (
        df_themes.groupby("theme")[["movie_count"]]
        .max()
        .reset_index()
        .sort_values("movie_count", ascending=False)
        .reset_index(drop=True)
    )

    return analytical


def write_analytical_csvs(analytical: dict[str, pd.DataFrame], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    mapping = {
        "main_metrics": "fc_main_metrics.csv",
        "movies_per_release_decade": "fc_movies_per_release_decade.csv",
        "popular_actors": "fc_popular_actors.csv",
        "popular_actors_movies": "fc_popular_actors_movies.csv",
        "popular_directors": "fc_popular_directors.csv",
        "popular_directors_movies": "fc_popular_directors_movies.csv",
        "popular_writers": "fc_popular_writers.csv",
        "popular_writers_movies": "fc_popular_writers_movies.csv",
        "movies_per_country": "fc_movies_per_country.csv",
        "movies_per_language": "fc_movies_per_language.csv",
        "movies_per_studio": "fc_movies_per_studio.csv",
        "popular_complete_genres": "fc_popular_complete_genres.csv",
        "popular_primary_genres": "fc_popular_primary_genres.csv",
        "popular_themes": "fc_popular_themes.csv",
    }

    for key, filename in mapping.items():
        analytical[key].to_csv(output_dir / filename, sep=";", index=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate analytical CSVs for Film Club report."
    )
    parser.add_argument(
        "--input-dir",
        default="data/film_club_data",
        help="Folder with raw film club CSVs.",
    )
    parser.add_argument(
        "--output-dir",
        default="data/film_club_data/analysis",
        help="Folder to write analytical CSVs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    raw = load_raw_data(input_dir)
    analytical = build_analytical_dataframes(raw)
    write_analytical_csvs(analytical, output_dir)

    written = [output_dir / name for name in ANALYSIS_CSVS]
    print("Wrote analytical CSVs:")
    for path in written:
        print(f"- {path}")


if __name__ == "__main__":
    main()
