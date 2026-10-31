# Repository Guidelines

## Project Structure & Module Organization
- `pipeline/`: pure-Python scraping and analytics (no notebooks). Settings (list URL, extra members, presentation cutoff, request delay) live in `pipeline/config.py`.
- `data/raw/`: data exactly as scraped from Letterboxd (`fc_*.csv`, `;`-separated). Never edit by hand; HTML cache in `data/raw/_cache/` (ignored by git).
- `data/analytics/`: derived tables (`fc_*.csv`) plus `report.json`, the only file the web report reads.
- `report.json` → `previous`: the same aggregates (metrics, decades, people, countries, languages, studios, genres, themes, members, group averages) computed only over the films presented in Nov 2024 (`presented: true`), for then-vs-now comparisons; ratings/likes are today's values. Mirrored in `data/analytics/fc_prev_*.csv`.
- `web/`: Next.js report, exported as a static site (`web/out/`). Read `web/AGENTS.md` before touching it.
- `legacy/`: frozen previous version (notebooks, Streamlit, Feb 2026 data). Do not change.
- `auths.env` holds old API credentials (unused by the pipeline); keep secrets out of Git history.

## Build, Test, and Development Commands
- Install Python deps: `pip install -r requirements.txt`
- Full update (scrape everything + analytics), from the repo root: `python -m pipeline` (add `--refresh` to ignore the HTML cache).
- Individual steps: `python -m pipeline.scrape_list`, `python -m pipeline.scrape_members`, `python -m pipeline.scrape_people`, `python -m pipeline.build_analytics`.
- Web report: `cd web && npm install && npm run build` (static output in `web/out/`); `npm run dev` for development.
- Letterboxd's Cloudflare blocks the `requests` TLS fingerprint on some pages; the pipeline uses `curl_cffi` impersonating Chrome.
- If you add scripts, document their usage here and keep them runnable from the repo root.

## Coding Style & Naming Conventions
- Prefer clear Python with short, descriptive variable names and explicit column names; 4-space indentation.
- Data files are snake_case and prefixed with `fc_`. Follow the same pattern for new exports.

## Testing Guidelines
- No automated test framework is currently configured.
- If you introduce tests, place them under `tests/` and document how to run them (e.g., `pytest`).

## Commit & Pull Request Guidelines
- Recent commits use imperative/past-tense summaries (e.g., "Optimized prompt.", "Added extraction loop and ran it."). Keep messages short and specific.
- PRs should include:
  - A brief summary of pipeline/report changes.
  - Links to relevant issues or data sources.
  - Screenshots or output snippets when analysis results change.

## Security & Configuration Tips
- Do not commit API keys or tokens. Use `auths.env` locally and add new secrets to `.gitignore` if needed.

## User's Reminders
- Last presentation to friends: Nov 2024, 70 movies, ending at Fallen Angels (commits `84b61c0`..`f441176`). Dr. Strangelove and Meshes of the Afternoon were watched right after it and are not part of the presented data. Kiss Kiss Bang Bang ended the Dec 2024 data update (78 movies), which was never presented. The pipeline encodes this cutoff as `LAST_PRESENTED_SLUG` in `pipeline/config.py`; Requiem for a Dream sits at position 32 but was added to the list after that presentation. See `PLANO.md`.
