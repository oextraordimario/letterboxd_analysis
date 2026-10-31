# Legado (congelado)

Versão anterior do projeto, preservada como referência. Não recebe mais mudanças.

- `notebooks/`: extração e análises originais em Jupyter (nov/2024 a fev/2026) e páginas
  HTML do Letterboxd salvas como referência. Os caminhos dentro dos notebooks são
  absolutos, da máquina em que foram escritos.
- `src/`: scripts da migração de fev/2026 (extração, preparo das análises, cache de fotos).
- `streamlit_app.py`: relatório em Streamlit.
- `data/`: dados raspados (`film_club_data/`, 127 filmes, fev/2026), perfil pessoal
  (`personal_profile_data/`) e saídas analíticas (`film_club_data/analysis/`).

Para rodar os scripts e o Streamlit, entre em `legacy/` (os caminhos são relativos):

```
cd legacy
pip install -r requirements.txt
python src/filmclub_analysis_prep.py
streamlit run streamlit_app.py
```

A versão atual fica na raiz do repositório (`pipeline/`, `data/`, `web/`).
