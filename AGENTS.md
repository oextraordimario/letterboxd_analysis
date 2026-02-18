# Repository Guidelines

## Project Structure & Module Organization
- Notebooks are archived under `refs/` (e.g., `refs/1 - data_extraction.ipynb`, `refs/2a - filmclubanalysis.ipynb`, `refs/2b - dromemarioanalysis.ipynb`).
- Source data lives in `data/film_club_data/` (film club exports) and `data/personal_profile_data/` (profile exports). Treat these as read-only inputs.
- Analytical outputs for the Streamlit report live in `data/film_club_data/analysis/`.
- `auths.env` holds credentials/config values used by notebooks; keep secrets out of Git history.

## Build, Test, and Development Commands
- There is no formal build system. Work is typically done in Jupyter.
- Example: launch a notebook server from the repo root:
  - `jupyter lab`
- Generate analytical CSVs for the Streamlit report:
  - `python src/filmclub_analysis_prep.py`
- Cache Letterboxd person images (optional):
  - `python src/filmclub_image_cache.py --use-playwright`
- Install Playwright browsers (first-time setup):
  - `python -m playwright install`
- Run the Streamlit report locally:
  - `streamlit run streamlit_app.py`
- If you add scripts, document their usage here and keep them runnable from the repo root.

## Coding Style & Naming Conventions
- Prefer clear, notebook-friendly Python with short, descriptive variable names and explicit column names.
- Use 4-space indentation in Python cells.
- Naming patterns in data files are snake_case and prefixed (e.g., `fc_*.csv`, `dromemario_*.csv`). Follow the same pattern for new exports.

## Testing Guidelines
- No automated test framework is currently configured.
- If you introduce tests, place them under `tests/` and document how to run them (e.g., `pytest`).

## Commit & Pull Request Guidelines
- Recent commits use imperative/past-tense summaries (e.g., ?Optimized prompt.?, ?Added extraction loop and ran it.?). Keep messages short and specific.
- PRs should include:
  - A brief summary of notebook changes.
  - Links to relevant issues or data sources.
  - Screenshots or output snippets when analysis results change.

## Security & Configuration Tips
- Do not commit API keys or tokens. Use `auths.env` locally and add new secrets to `.gitignore` if needed.
- If sharing notebooks, strip outputs that expose sensitive data.
