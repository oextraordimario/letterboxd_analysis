from __future__ import annotations

from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st


ANALYSIS_DIR = Path("data/film_club_data/analysis")


@st.cache_data(show_spinner=False)
def load_csv(name: str) -> pd.DataFrame:
    return pd.read_csv(ANALYSIS_DIR / name, sep=";")


def bar_chart(
    df: pd.DataFrame,
    x: str,
    y: str,
    title: str,
    height: int = 320,
    width: int = 720,
    text_offset: int = 8,
) -> alt.Chart:
    base = (
        alt.Chart(df)
        .mark_bar(color="#0B2C4A")
        .encode(
            x=alt.X(x, title=""),
            y=alt.Y(y, title="", sort=None),
        )
        .properties(title=title, width=width, height=height)
    )
    text = base.mark_text(align="left", dx=text_offset, color="#111").encode(
        text=alt.Text(x)
    )
    return base + text


def top_people(df: pd.DataFrame, top_n: int = 3, max_total: int = 5) -> pd.DataFrame:
    df_sorted = df.sort_values("movie_count", ascending=False).reset_index(drop=True)
    if df_sorted.empty:
        return df_sorted
    if len(df_sorted) <= top_n:
        return df_sorted
    cutoff = df_sorted.loc[top_n - 1, "movie_count"]
    tied = df_sorted.loc[df_sorted["movie_count"] >= cutoff]
    if len(tied) <= max_total:
        return tied
    return df_sorted.head(max_total)


def show_person_section(
    title: str,
    people_df: pd.DataFrame,
    movies_df: pd.DataFrame,
    images_df: pd.DataFrame,
    role: str,
) -> None:
    st.markdown(f"### {title}")
    if people_df.empty:
        st.write("Sem dados para exibir.")
        return

    chart_df = people_df.drop(columns=["link"], errors="ignore")
    st.altair_chart(
        bar_chart(
            chart_df,
            x="movie_count",
            y="name",
            title=title,
            height=min(500, 40 * len(chart_df) + 60),
        ),
        use_container_width=True,
    )

    for _, row in people_df.iterrows():
        name = row["name"]
        movie_count = row["movie_count"]
        link = row["link"]
        if link.startswith("http://") or link.startswith("https://"):
            person_url = link
        elif link.startswith("/"):
            person_url = f"https://letterboxd.com{link}"
        elif link.startswith("letterboxd.com"):
            person_url = f"https://{link}"
        else:
            person_url = f"https://letterboxd.com/{link.lstrip('/')}"

        image_row = images_df.loc[
            (images_df["name"] == name) & (images_df["role"] == role)
        ]
        image_path = None
        if not image_row.empty:
            rel_path = image_row.iloc[0]["image_path"]
            if isinstance(rel_path, str) and rel_path:
                candidate = ANALYSIS_DIR / rel_path
                if candidate.exists():
                    image_path = candidate

        with st.expander(f"{name} — {movie_count} filmes"):
            if image_path:
                st.image(str(image_path), width=220)
            st.markdown(f"[Letterboxd]({person_url})")

            person_movies = movies_df.loc[movies_df["name"] == name][
                "film_title"
            ].tolist()
            if person_movies:
                st.write(", ".join(person_movies))
            else:
                st.write("Nenhum filme encontrado.")


def main() -> None:
    st.set_page_config(page_title="Film-Fueled-Friends: Wrapped", layout="wide")

    st.title("Film-Fueled-Friends: Wrapped")
    st.markdown(
        "Uma análise do nosso histórico de cinefilia entre amigos",
    )

    st.markdown("## Objetivos da apresentação")
    st.markdown(
        "- Trazer dados curiosos sobre os filmes que assistimos\n"
        "- Sugerir roadmap de filmes futuros\n"
        "- Incentivar o Jhones a usar o Letterboxd"
    )

    main_metrics = load_csv("fc_main_metrics.csv").iloc[0]

    st.markdown("## Dados gerais")
    cols = st.columns(4)
    cols[0].metric("Filmes Assistidos", int(main_metrics["movies_watched"]))
    cols[1].metric("Minutos Assistidos", int(main_metrics["minutes_watched"]))
    cols[2].metric("Horas Assistidas", main_metrics["hours_watched"])
    cols[3].metric("Dias Assistidos", main_metrics["days_watched"])

    cols = st.columns(3)
    cols[0].metric("Duração Média de Filme", main_metrics["avg_movie_length"])
    cols[1].metric("Filme Mais Longo", main_metrics["name_longest_movie"])
    cols[2].metric("Duração", int(main_metrics["duration_longest_movie"]))

    cols = st.columns(3)
    cols[0].metric("Filme Mais Curto", main_metrics["name_shortest_movie"])
    cols[1].metric("Duração", int(main_metrics["duration_shortest_movie"]))
    cols[2].metric("Nota Média no Letterboxd", main_metrics["avg_lbxd_rating"])

    cols = st.columns(2)
    cols[0].metric("Filme com Melhores Notas", main_metrics["best_lbxd_rating"])
    cols[1].metric("Filme com Piores Notas", main_metrics["worst_lbxd_rating"])

    mpd = load_csv("fc_movies_per_release_decade.csv")
    st.altair_chart(
        bar_chart(mpd, x="movie_count", y="release_decade", title="Filmes por década"),
        use_container_width=True,
    )

    st.markdown("## Elenco")
    popular_actors = load_csv("fc_popular_actors.csv")
    popular_actors_movies = load_csv("fc_popular_actors_movies.csv")

    images_path = ANALYSIS_DIR / "fc_person_images.csv"
    images_df = (
        pd.read_csv(images_path, sep=";") if images_path.exists() else pd.DataFrame()
    )

    show_person_section(
        "Filmes Assistidos por Ator/Atriz",
        top_people(popular_actors),
        popular_actors_movies,
        images_df,
        role="actor",
    )

    st.markdown("## Diretores")
    popular_directors = load_csv("fc_popular_directors.csv")
    popular_directors_movies = load_csv("fc_popular_directors_movies.csv")
    show_person_section(
        "Filmes Assistidos por Diretor(a)",
        top_people(popular_directors),
        popular_directors_movies,
        images_df,
        role="director",
    )

    st.markdown("## Roteiristas")
    popular_writers = load_csv("fc_popular_writers.csv")
    popular_writers_movies = load_csv("fc_popular_writers_movies.csv")
    show_person_section(
        "Filmes Assistidos por Roteirista",
        top_people(popular_writers),
        popular_writers_movies,
        images_df,
        role="writer",
    )

    st.markdown("## Países, idiomas e estúdios")
    mpc = load_csv("fc_movies_per_country.csv")
    st.altair_chart(
        bar_chart(mpc, x="movie_count", y="country", title="Filmes por país"),
        use_container_width=True,
    )

    mpl = load_csv("fc_movies_per_language.csv")
    st.altair_chart(
        bar_chart(mpl, x="movie_count", y="language", title="Filmes por idioma"),
        use_container_width=True,
    )

    mps = load_csv("fc_movies_per_studio.csv")
    st.altair_chart(
        bar_chart(mps, x="movie_count", y="studio", title="Filmes por estúdio"),
        use_container_width=True,
    )

    st.markdown("## Gêneros e temas")
    pcg = load_csv("fc_popular_complete_genres.csv")
    st.altair_chart(
        bar_chart(pcg, x="film_title", y="genre", title="Gêneros (todos)"),
        use_container_width=True,
    )

    ppg = load_csv("fc_popular_primary_genres.csv")
    st.altair_chart(
        bar_chart(ppg, x="film_title", y="genre", title="Gêneros principais"),
        use_container_width=True,
    )

    pt = load_csv("fc_popular_themes.csv").head(20)
    st.altair_chart(
        bar_chart(
            pt,
            x="movie_count",
            y="theme",
            title="Top 20 temas por número de filmes",
            height=520,
        ),
        use_container_width=True,
    )

    st.markdown("## Sugestões de filmes pro futuro")
    st.markdown(
        "- Um filme da década de 30 e um da década de 60, já que são as únicas faltando.\n"
        "- Dois filmes do Nicolas Cage, para que ele tome seu lugar de direito.\n"
        "- Pelo menos um filme brasileiro pra não dar vexame.\n"
        "- Pra valorizar a indústria nacional, mais filmes brasileiros.\n"
        "- Pra incentivar a igualdade, mais filmes dirigidos por mulheres.\n"
        "- Mais filmes musicais!\n"
        "- Jhones logar mais filmes!!!"
    )


if __name__ == "__main__":
    main()
