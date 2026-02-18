from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import requests


ROLE_FILES = {
    "actor": "fc_popular_actors.csv",
    "director": "fc_popular_directors.csv",
    "writer": "fc_popular_writers.csv",
}


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_") or "unknown"


def _normalize_person_url(link: str) -> str:
    if link.startswith("http://") or link.startswith("https://"):
        return link
    if link.startswith("www.letterboxd.com"):
        return f"https://{link}"
    if link.startswith("letterboxd.com"):
        return f"https://{link}"
    if link.startswith("/"):
        return f"https://letterboxd.com{link}"
    return f"https://letterboxd.com/{link.lstrip('/')}"


def _top_people(df: pd.DataFrame, top_n: int = 3, max_total: int = 5) -> pd.DataFrame:
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


def _guess_ext(url: str) -> str:
    parsed = urlparse(url)
    ext = Path(parsed.path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return ext
    return ".jpg"


def load_people(analysis_dir: Path) -> pd.DataFrame:
    rows = []
    for role, filename in ROLE_FILES.items():
        path = analysis_dir / filename
        if not path.exists():
            raise FileNotFoundError(
                f"Missing {path}. Run filmclub_analysis_prep.py first."
            )
        df = pd.read_csv(path, sep=";")
        df = _top_people(df)
        df["role"] = role
        rows.append(df[["name", "link", "role"]])
    combined = pd.concat(rows).drop_duplicates(subset=["name", "link", "role"])
    return combined.reset_index(drop=True)


def _session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
            "Referer": "https://letterboxd.com/",
        }
    )
    return session


def fetch_image_url_playwright(
    person_url: str,
    timeout: int = 20000,
    debug_dir: Path | None = None,
    debug_name: str | None = None,
    profile_dir: Path | None = None,
    headed: bool = False,
) -> str | None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is not installed. Run: pip install playwright "
            "and then: python -m playwright install"
        ) from exc

    with sync_playwright() as p:
        if profile_dir:
            context = p.chromium.launch_persistent_context(
                str(profile_dir), headless=not headed
            )
            page = context.new_page()
        else:
            browser = p.chromium.launch(headless=not headed)
            page = browser.new_page()
        page.goto(person_url, wait_until="domcontentloaded", timeout=timeout)

        # Try common selectors for person images.
        selectors = [
            "img.js-tmdb-person",
            "div.avatar.person-image.image-loaded img",
            "div.avatar.person-image img",
        ]
        image_url = None
        page.wait_for_timeout(1000)

        for selector in selectors:
            locator = page.locator(selector)
            if locator.count() > 0:
                handle = locator.first
                data_image = handle.get_attribute("data-image")
                src = handle.get_attribute("src")
                if data_image:
                    image_url = data_image
                    break
                if src:
                    image_url = src
                    break

        # Some pages store background-image on the avatar container.
        if not image_url:
            container = page.locator("div.avatar.person-image").first
            if container.count() > 0:
                style = container.get_attribute("style") or ""
                match = re.search(
                    r'background-image:\\s*url\\(["\\\']?([^"\\\']+)["\\\']?\\)',
                    style,
                )
                if match:
                    image_url = match.group(1)

        # Fallback: scan rendered HTML for data-image attribute.
        if not image_url:
            html = page.content()
            image_url = _extract_image_from_html(html)

        if not image_url and debug_dir and debug_name:
            debug_dir.mkdir(parents=True, exist_ok=True)
            html_path = debug_dir / f"{debug_name}.html"
            html_path.write_text(page.content(), encoding="utf-8")
            screenshot_path = debug_dir / f"{debug_name}.png"
            try:
                page.screenshot(path=str(screenshot_path), full_page=True)
            except Exception:
                pass

        if profile_dir:
            context.close()
        else:
            browser.close()
        return image_url


def _extract_image_from_html(html: str) -> str | None:
    # Fallback: scan raw HTML for data-image="...".
    match = re.search(r'data-image\\s*=\\s*["\\\']([^"\\\']+)["\\\']', html)
    if match:
        return match.group(1)

    # Last resort: grab first TMDB image URL.
    match = re.search(r'https://image\\.tmdb\\.org/t/p/[^"\\\']+', html)
    if match:
        return match.group(0)

    return None


def _html_filename_from_link(link: str) -> str:
    slug = link.strip("/").replace("/", "_")
    return f"letterboxd.com_{slug}_.html"


def _load_local_html(html_dir: Path, link: str) -> str | None:
    filename = _html_filename_from_link(link)
    path = html_dir / filename
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8", errors="ignore")


def fetch_image_url(
    person_url: str,
    session: requests.Session,
    timeout: int = 20,
    html_dir: Path | None = None,
    link: str | None = None,
    use_playwright: bool = False,
    debug_dir: Path | None = None,
    debug_name: str | None = None,
    profile_dir: Path | None = None,
    headed: bool = False,
) -> str | None:
    if use_playwright:
        return fetch_image_url_playwright(
            person_url,
            timeout=timeout * 1000,
            debug_dir=debug_dir,
            debug_name=debug_name,
            profile_dir=profile_dir,
            headed=headed,
        )

    try:
        response = session.get(person_url, timeout=timeout)
        response.raise_for_status()
        return _extract_image_from_html(response.text)
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 403:
            if html_dir and link:
                local_html = _load_local_html(html_dir, link)
                if local_html:
                    return _extract_image_from_html(local_html)
        raise


def download_image(
    image_url: str, dest: Path, session: requests.Session, timeout: int = 30
) -> None:
    response = session.get(image_url, timeout=timeout)
    response.raise_for_status()
    dest.write_bytes(response.content)


def cache_images(
    analysis_dir: Path,
    images_dir: Path,
    force: bool = False,
    html_dir: Path | None = None,
    use_playwright: bool = False,
    debug_dir: Path | None = None,
    profile_dir: Path | None = None,
    headed: bool = False,
) -> pd.DataFrame:
    images_dir.mkdir(parents=True, exist_ok=True)
    people = load_people(analysis_dir)
    total_people = len(people)
    print(f"Found {total_people} people to process.")
    print(f"Images directory: {images_dir}")
    session = _session()
    records = []

    for idx, row in people.iterrows():
        name = row["name"]
        link = row["link"]
        role = row["role"]
        person_url = _normalize_person_url(link)

        print(f"[{idx + 1}/{total_people}] Extracting image for {name} ({role})")

        slug = _slugify(f"{role}_{name}")
        image_url = None
        image_path = None
        status = "skipped"
        error_message = ""

        try:
            image_url = fetch_image_url(
                person_url,
                session=session,
                html_dir=html_dir,
                link=link,
                use_playwright=use_playwright,
                debug_dir=debug_dir,
                debug_name=slug,
                profile_dir=profile_dir,
                headed=headed,
            )
            if image_url:
                ext = _guess_ext(image_url)
                image_path = images_dir / f"{slug}{ext}"
                if force or not image_path.exists():
                    download_image(image_url, image_path, session=session)
                status = "ok"
            else:
                status = "no_image_found"
        except Exception as exc:
            status = "error"
            error_message = str(exc)

        records.append(
            {
                "name": name,
                "role": role,
                "link": link,
                "person_url": person_url,
                "image_url": image_url or "",
                "image_path": str(image_path.relative_to(analysis_dir))
                if image_path
                else "",
                "status": status,
                "error_message": error_message,
            }
        )

    return pd.DataFrame(records)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cache person images for the Film Club report."
    )
    parser.add_argument(
        "--analysis-dir",
        default="data/film_club_data/analysis",
        help="Folder containing analytical CSVs.",
    )
    parser.add_argument(
        "--images-dir",
        default="data/film_club_data/analysis/person_images",
        help="Folder to write cached images.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download images even if they exist.",
    )
    parser.add_argument(
        "--html-dir",
        default="",
        help="Optional folder with saved Letterboxd HTML files for fallback.",
    )
    parser.add_argument(
        "--use-playwright",
        action="store_true",
        help="Use Playwright to render pages and extract images (avoids 403s).",
    )
    parser.add_argument(
        "--use-requests",
        action="store_true",
        help="Use requests + HTML parsing instead of Playwright.",
    )
    parser.add_argument(
        "--debug-dir",
        default="data/film_club_data/analysis/debug_html",
        help="Folder to write debug HTML/screenshot when no image is found.",
    )
    parser.add_argument(
        "--profile-dir",
        default="src/playwright_profile",
        help="Playwright persistent profile dir (use to pass Cloudflare checks).",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run Playwright with a visible browser window.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    analysis_dir = Path(args.analysis_dir)
    images_dir = Path(args.images_dir)
    html_dir = Path(args.html_dir) if args.html_dir else None
    use_playwright = not args.use_requests
    debug_dir = Path(args.debug_dir) if args.debug_dir else None
    profile_dir = Path(args.profile_dir) if args.profile_dir else None

    df = cache_images(
        analysis_dir,
        images_dir,
        force=args.force,
        html_dir=html_dir,
        use_playwright=use_playwright,
        debug_dir=debug_dir,
        profile_dir=profile_dir,
        headed=args.headed,
    )
    output_csv = analysis_dir / "fc_person_images.csv"
    df.to_csv(output_csv, sep=";", index=False)

    summary = df["status"].value_counts().to_dict()
    print("Cached images summary:", summary)
    print(f"Successful images: {summary.get('ok', 0)}")
    print(f"No image found: {summary.get('no_image_found', 0)}")
    print(f"Errors: {summary.get('error', 0)}")
    print(f"Wrote mapping CSV: {output_csv}")


if __name__ == "__main__":
    main()
