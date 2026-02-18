import argparse
import hashlib
import os
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[1]
FILMCLUB_FOLDER = REPO_ROOT / "film_club_data"
AUTH_ENV = REPO_ROOT / "auths.env"


def load_env():
    if AUTH_ENV.exists():
        load_dotenv(AUTH_ENV)


def get_film_urls_lbxdlist(list_url):
    url_list = []
    page = 1
    if not list_url.endswith("/"):
        list_url += "/"
    headers = {"User-Agent": "Mozilla/5.0"}
    while True:
        page_url = f"{list_url}page/{page}/"
        content = requests.get(page_url, headers=headers).text
        soup = BeautifulSoup(content, "html.parser")
        page_url_list = [el.get("data-item-link") for el in soup.select("[data-item-link]")]
        if not page_url_list:
            page_url_list = [el.get("data-target-link") for el in soup.select("[data-target-link]")]
        if not page_url_list:
            page_url_list = [a.get("href") for a in soup.select('a[href^="/film/"]')]
        page_url_list = [u for u in page_url_list if u]
        if not page_url_list:
            break
        url_list += page_url_list
        page += 1
    return url_list


def get_raw_film_html(film_url):
    url = "https://letterboxd.com" + film_url
    headers = {"User-Agent": "Mozilla/5.0"}
    content = requests.get(url, headers=headers).text
    soup = BeautifulSoup(content, "html.parser")
    return soup


def get_general_film_data(soup):
    footer = soup.find(class_="text-footer")
    duration_string = footer.get_text().replace("\xa0", " ").strip() if footer else ""

    film_el = soup.select_one("[data-item-link]") or soup.select_one("[data-film-id]")
    film_id = film_el.get("data-film-id") if film_el else None
    film_link = film_el.get("data-item-link") if film_el else None
    if not film_link:
        og_url = soup.find(property="og:url")
        film_link = og_url["content"] if og_url else ""
    if film_link and film_link.startswith("http"):
        if "/film/" in film_link:
            film_link = "/film/" + film_link.split("/film/", 1)[1]
        else:
            film_link = ""
    film_slug = film_link.rstrip("/").split("/")[-1] if film_link else ""

    og_title_el = soup.find(property="og:title")
    og_title = og_title_el["content"] if og_title_el else ""
    title_el = soup.find("h1", class_="filmtitle")
    if title_el:
        short_title = title_el.get_text(strip=True)
    elif og_title:
        short_title = og_title.split(" (", 1)[0]
    else:
        short_title = ""

    tmdb_el = soup.find("a", {"data-track-action": "TMDb"})
    tmdb_url = tmdb_el["href"] if tmdb_el else ""

    twitter_title_el = soup.find("meta", attrs={"name": "twitter:title"})
    twitter_title = twitter_title_el["content"] if twitter_title_el else ""
    year_match = re_search_year(twitter_title, og_title)
    release_year = year_match or ""

    general_data = {
        "letterboxd_id": film_id,
        "letterboxd_shorttitle": short_title,
        "letterboxd_longtitle": og_title,
        "letterboxd_slug": film_slug,
        "letterboxd_url": soup.find(property="og:url")["content"]
        if soup.find(property="og:url")
        else "",
        "imdb_url": "",
        "tmdb_url": tmdb_url,
        "tmdb_id": "",
        "release_year": release_year,
        "duration": "",
        "avg_rating": "",
    }

    try:
        general_data["duration"] = re_search_duration(duration_string) or ""
    except Exception:
        general_data["duration"] = ""

    try:
        general_data["avg_rating"] = (
            soup.find("a", class_="has-icon icon-watched icon-16 tooltip")
            .get_text()
            .strip()
        )
    except Exception:
        general_data["avg_rating"] = ""

    if not general_data["avg_rating"]:
        twitter_avg_el = soup.find("meta", attrs={"name": "twitter:data2"})
        twitter_avg = twitter_avg_el["content"] if twitter_avg_el else ""
        avg_match = re_search_avg(twitter_avg)
        general_data["avg_rating"] = avg_match or ""

    try:
        general_data["imdb_url"] = soup.find("a", {"data-track-action": "IMDb"})["href"]
    except Exception:
        general_data["imdb_url"] = ""

    if general_data["tmdb_url"]:
        general_data["tmdb_id"] = general_data["tmdb_url"].split("/")[-2]
    else:
        body = soup.find("body")
        tmdb_id = body.get("data-tmdb-id") if body else None
        tmdb_type = body.get("data-tmdb-type") if body else "movie"
        if tmdb_id:
            general_data["tmdb_id"] = tmdb_id
            general_data["tmdb_url"] = f"https://www.themoviedb.org/{tmdb_type}/{tmdb_id}"

    return general_data


def re_search_year(twitter_title, og_title):
    import re

    year_match = re.search(r"\((\d{4})\)", twitter_title) or re.search(
        r"\((\d{4})\)", og_title
    )
    return year_match.group(1) if year_match else ""


def re_search_duration(duration_string):
    import re

    match = re.search(r"(\d+)\s+mins", duration_string)
    return match.group(1) if match else ""


def re_search_avg(twitter_avg):
    import re

    avg_match = re.search(r"(\d+(?:\.\d+)?)", twitter_avg)
    return avg_match.group(1) if avg_match else ""


def get_film_cast(soup):
    cast_list = []

    cast_container = soup.find(name="div", class_="cast-list")
    if not cast_container:
        return cast_list

    try:
        cast = cast_container.find_all("a", class_="tooltip")

        for member in cast:
            cast_member_info = {
                "name": member.get_text(strip=True),
                "link": member["href"],
            }

            try:
                cast_member_info["character_name"] = member["title"]
            except Exception:
                cast_member_info["character_name"] = None
            cast_list.append(cast_member_info)
    except Exception:
        cast_list = []

    return cast_list


def get_film_crew(soup):
    crew_list = []

    crew_tab = soup.find(id="tab-crew")
    if not crew_tab:
        return crew_list

    try:
        crew = crew_tab.find_all("a")

        for member in crew:
            split_link = member["href"].split("/")

            crew_member_info = {
                "name": member.get_text(strip=True),
                "role": split_link[1],
                "link": member["href"],
            }
            crew_list.append(crew_member_info)
    except Exception:
        crew_list = []

    return crew_list


def get_film_details(soup):
    details_list = []
    details_tab = soup.find(id="tab-details")
    if not details_tab:
        return details_list

    details = details_tab.find_all("a")

    for detail in details:
        detail_info = {
            "key": "",
            "value": detail.get_text(strip=True),
            "link": detail["href"],
        }

        if "studio" in detail["href"]:
            detail_info["key"] = "studio"
        elif "country" in detail["href"]:
            detail_info["key"] = "country"
        elif "language" in detail["href"]:
            detail_info["key"] = "language"
        else:
            detail_info["key"] = "ERROR"
        details_list.append(detail_info)

    return details_list


def get_film_genres(soup):
    genres_tab = soup.find(id="tab-genres")
    if not genres_tab:
        return []
    genres = [a_tag.get_text(strip=True) for a_tag in genres_tab.find_all("a")]
    return genres[:-1] if genres else []


def get_complete_film_data(film_url):
    film_soup = get_raw_film_html(film_url)

    film_data = {
        "general_data": get_general_film_data(film_soup),
        "cast": get_film_cast(film_soup),
        "crew": get_film_crew(film_soup),
        "details": get_film_details(film_soup),
        "genres_and_themes": get_film_genres(film_soup),
    }

    return film_data


def get_all_films(url_list):
    whole_data = []

    counter = 0
    for film in url_list:
        print(f"Extracting from URL #{counter}:\n{film}\n")
        whole_data.append(get_complete_film_data(film))
        counter += 1

    return whole_data


def dicts_to_dfs(data):
    all_dfs_gdata = []
    all_dfs_cast = []
    all_dfs_crew = []
    all_dfs_details = []
    all_dfs_gthemes = []

    for film in data:
        film_id = film["general_data"]["letterboxd_id"]
        title = film["general_data"]["letterboxd_shorttitle"]

        single_df_gdata = pd.DataFrame.from_dict([film["general_data"]])
        all_dfs_gdata.append(single_df_gdata)

        single_df_cast = pd.DataFrame.from_dict(film["cast"]).assign(
            film_id=film_id, film_title=title
        )
        all_dfs_cast.append(single_df_cast)

        single_df_crew = pd.DataFrame.from_dict(film["crew"]).assign(
            film_id=film_id, film_title=title
        )
        all_dfs_crew.append(single_df_crew)

        single_df_details = pd.DataFrame.from_dict(film["details"]).assign(
            film_id=film_id, film_title=title
        )
        all_dfs_details.append(single_df_details)

        single_df_gthemes = pd.DataFrame.from_dict(film["genres_and_themes"]).assign(
            film_id=film_id, film_title=title
        )
        all_dfs_gthemes.append(single_df_gthemes)

    all_dfs_dict = {
        "df_gdata": pd.concat(all_dfs_gdata).reset_index(drop=True),
        "df_cast": pd.concat(all_dfs_cast).reset_index(drop=True),
        "df_crew": pd.concat(all_dfs_crew).reset_index(drop=True),
        "df_details": pd.concat(all_dfs_details).reset_index(drop=True),
        "df_gthemes": pd.concat(all_dfs_gthemes).reset_index(drop=True),
    }

    return all_dfs_dict


def build_filmclub_dfs(filmclub_list_url):
    filmclub_film_urls = get_film_urls_lbxdlist(filmclub_list_url)
    filmclub_films_data = get_all_films(filmclub_film_urls)
    all_dfs_dict = dicts_to_dfs(filmclub_films_data)

    df_generaldata = (
        all_dfs_dict["df_gdata"][
            [
                "letterboxd_id",
                "letterboxd_shorttitle",
                "letterboxd_longtitle",
                "letterboxd_slug",
                "letterboxd_url",
                "imdb_url",
                "tmdb_url",
                "tmdb_id",
                "release_year",
                "duration",
                "avg_rating",
            ]
        ]
        .astype(
            {
                "release_year": "int64",
                "duration": "int64",
                "avg_rating": "float64",
                "letterboxd_url": "string",
                "tmdb_url": "string",
                "imdb_url": "string",
            }
        )
        .reset_index(drop=True)
    )

    df_cast = (
        all_dfs_dict["df_cast"][
            [
                "name",
                "link",
                "character_name",
                "film_id",
                "film_title",
            ]
        ]
        .reset_index(drop=True)
        .astype({"link": "string"})
    )

    df_crew = (
        all_dfs_dict["df_crew"][
            [
                "name",
                "role",
                "link",
                "film_id",
                "film_title",
            ]
        ]
        .reset_index(drop=True)
        .astype({"link": "string"})
    )

    df_details = (
        all_dfs_dict["df_details"][
            [
                "key",
                "value",
                "link",
                "film_id",
                "film_title",
            ]
        ]
        .reset_index(drop=True)
        .astype({"link": "string"})
    )

    df_genresthemes = (
        all_dfs_dict["df_gthemes"][
            [
                0,
                "film_id",
                "film_title",
            ]
        ]
        .reset_index(drop=True)
    )

    return {
        "fc_generaldata": df_generaldata,
        "fc_cast": df_cast,
        "fc_crew": df_crew,
        "fc_details": df_details,
        "fc_genresthemes": df_genresthemes,
    }


def write_filmclub_csvs(dfs, suffix):
    FILMCLUB_FOLDER.mkdir(parents=True, exist_ok=True)
    out_paths = {}
    for key, df in dfs.items():
        filename = f"{key}{suffix}.csv"
        path = FILMCLUB_FOLDER / filename
        if key == "fc_generaldata":
            df.to_csv(path, sep=";", index=False, float_format="%.2f")
        else:
            df.to_csv(path, sep=";", index=False)
        out_paths[key] = path
    return out_paths


def file_md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def compare_csvs(new_path, existing_path):
    report = []
    report.append(f"New file: {new_path}")
    report.append(f"Existing file: {existing_path}")

    if not existing_path.exists():
        report.append("Existing file missing.")
        return report, False

    new_size = new_path.stat().st_size
    existing_size = existing_path.stat().st_size
    report.append(f"Byte size new: {new_size}")
    report.append(f"Byte size existing: {existing_size}")
    report.append(f"MD5 new: {file_md5(new_path)}")
    report.append(f"MD5 existing: {file_md5(existing_path)}")

    new_df = pd.read_csv(new_path, sep=";")
    existing_df = pd.read_csv(existing_path, sep=";")

    report.append(f"Shape new: {new_df.shape}")
    report.append(f"Shape existing: {existing_df.shape}")
    report.append(f"Columns new: {list(new_df.columns)}")
    report.append(f"Columns existing: {list(existing_df.columns)}")

    if list(new_df.columns) == list(existing_df.columns):
        col_equal = True
    else:
        col_equal = False

    dtype_new = {c: str(t) for c, t in new_df.dtypes.items()}
    dtype_existing = {c: str(t) for c, t in existing_df.dtypes.items()}
    report.append(f"Dtypes new: {dtype_new}")
    report.append(f"Dtypes existing: {dtype_existing}")

    exact_equal = new_df.equals(existing_df)
    report.append(f"DataFrame exact equality: {exact_equal}")

    if not exact_equal:
        try:
            diff = (new_df != existing_df) & ~(new_df.isna() & existing_df.isna())
            diff_counts = diff.sum().to_dict()
            report.append(f"Cell-level diffs by column: {diff_counts}")
        except Exception as exc:
            report.append(f"Cell-level diff failed: {exc}")

    files_match = (
        new_size == existing_size
        and file_md5(new_path) == file_md5(existing_path)
        and new_df.shape == existing_df.shape
        and col_equal
        and exact_equal
    )

    report.append(f"Files match (strict): {files_match}")
    return report, files_match


def build_report(out_paths, suffix, report_path):
    lines = []
    all_match = True
    for key, new_path in out_paths.items():
        existing_path = FILMCLUB_FOLDER / f"{key}.csv"
        report, match = compare_csvs(new_path, existing_path)
        lines.append("\n".join(report))
        lines.append("-" * 80)
        if not match:
            all_match = False

    summary = "ALL FILES MATCH" if all_match else "DIFFERENCES FOUND"
    lines.append(summary)
    report_text = "\n".join(lines)
    report_path.write_text(report_text, encoding="utf-8")
    return report_text


def parse_args():
    parser = argparse.ArgumentParser(
        description="Extract film club data from Letterboxd and write CSVs."
    )
    parser.add_argument(
        "--list-url",
        default="https://letterboxd.com/dromemario/list/fff-film-fueled-friends/",
        help="Letterboxd list URL to extract.",
    )
    parser.add_argument(
        "--suffix",
        default="",
        help="Suffix for output CSV filenames (e.g., _new). Default: no suffix.",
    )
    parser.add_argument(
        "--report-path",
        default=str(REPO_ROOT / "refs" / "filmclub_extract_report.txt"),
        help="Path to write the comparison report.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    load_env()

    dfs = build_filmclub_dfs(args.list_url)
    out_paths = write_filmclub_csvs(dfs, args.suffix)

    report_path = Path(args.report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_text = build_report(out_paths, args.suffix, report_path)

    print(report_text)


if __name__ == "__main__":
    main()
