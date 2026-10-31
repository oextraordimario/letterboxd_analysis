# Plano — reestruturação do film_club_analysis

Registrado em 31/10/2026. **Status:** etapas 1–4 e 6 concluídas em 31/10/2026; deploy (etapa 5) aguardando confirmação.

## Objetivo

Atualizar dados e análises do clube (lista `dromemario/list/fff-familia-fa-de-filmes/`,
antes `fff-film-fueled-friends`), trocar notebooks por um pipeline em Python puro,
migrar a apresentação de Streamlit para um relatório estático em Next e adicionar a
análise de notas do grupo.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Membros do grupo | Quem curtiu a lista (hoje `marmito`, `pratini`, `instalkiane`) + `dromemario` + `zafrina`. Lista final em arquivo de config, editável à mão. |
| Perfil pessoal (notebook 2b, `dromemario_*`) | Fica só no legado. |
| Dados atuais (127 filmes, fev/2026) | Vão para `legacy/` com o código; o pipeline novo raspa tudo do zero. |
| Deploy | Export estático do Next na Vercel. Confirmar antes de publicar. |
| Corte "desde a última apresentação" | Última apresentação: nov/2024, 70 filmes, terminando em *Fallen Angels* (ver abaixo). |

## Estrutura alvo

```
legacy/            # tudo que existe hoje, congelado (notebooks, src/, streamlit_app.py, data/)
pipeline/          # raspagem e análises em Python puro
  config.py        # URL da lista, membros extras, pausas entre requisições
  scrape_list.py   # filmes da lista + elenco, equipe, detalhes, gêneros/temas
  scrape_members.py# membros (curtidas + extras) e todas as notas de cada um
  build_analytics.py
data/
  raw/             # só o que foi raspado, sem tratamento (+ cache de HTML, ignorado no git)
  analytics/       # derivados: CSVs e JSONs consumidos pelo site
web/               # relatório em Next (export estático)
```

## Etapas (um commit por etapa)

1. **Legado** — `git mv` de notebooks, `src/`, `streamlit_app.py` e `data/` para
   `legacy/`, com um README dizendo que está congelado.
2. **Raspagem** (`requests` + BeautifulSoup, sem Playwright):
   - Lista: replica `fc_generaldata`, `fc_cast`, `fc_crew`, `fc_details`,
     `fc_genresthemes`, preservando a ordem da lista (= ordem em que vimos).
   - Membros: `/<lista>/likes/` + extras da config.
   - Notas: `/<user>/films/` paginado; cada filme traz `data-item-slug` e `rated-N`
     (N = meias-estrelas). Uma raspagem por membro, depois junção pelo slug.
   - Datas de exibição: diário do `dromemario` (`/films/diary/for/AAAA/MM/`).
   - Pausa entre requisições e cache de HTML para reexecução barata.
3. **Análises** — refaz as do Streamlit (métricas gerais, décadas, elenco, direção,
   roteiro, países, idiomas, estúdios, gêneros, temas) e adiciona:
   - média do grupo por filme (só quem deu nota) e número de votantes;
   - divergência para a média do Letterboxd: filmes que gostamos mais e menos;
   - quem do grupo dá notas mais altas/baixas e filmes que mais racharam o grupo
     (desvio-padrão);
   - recorte "desde a última apresentação" (filmes depois de *Fallen Angels*, hoje na posição 71).
4. **Relatório em Next** em `web/` — página única, lê os JSONs de `data/analytics/`
   no build. Seções atuais + notas do grupo + divergência + novidades. Dev server via
   `preview_start` e `predev` que mata Next órfão.
5. **Deploy** estático na Vercel.
6. **Docs** — atualizar `AGENTS.md` e `requirements.txt` (sai Streamlit/Playwright).

## Linha do tempo das atualizações anteriores

Reconstruída pelo histórico do git e pelo diário do Letterboxd:

| Data | Commit | Filmes | Último da lista | Observação |
|---|---|---|---|---|
| 13–15/11/2024 | `84b61c0`…`f441176` | 70 | Fallen Angels | Versão apresentada aos amigos (nov/2024). |
| 16/11/2024 | `e85a600` | 72 | Meshes of the Afternoon | Entraram Dr. Strangelove e Meshes, vistos logo depois da apresentação. |
| 25/12/2024 | `eb16247` | 78 | Kiss Kiss Bang Bang | Atualização de dados, não apresentada. KKBB foi visto em dez/2024. |
| 18/02/2026 | `077494e` | 127 | Stand by Me | Reextração para a migração a Streamlit. |
| 31/10/2026 | — | 154 | — | Estado atual da lista. |

## Riscos

- Letterboxd muda o HTML com frequência; o cache de HTML bruto permite reprocessar sem
  raspar de novo.
- Perfis com notas privadas ou membros que não viram um filme reduzem os votantes; a
  análise de divergência exige um mínimo de votantes por filme.
