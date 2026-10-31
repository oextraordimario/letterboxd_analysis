import { BarList } from "@/components/BarList";
import { Deck } from "@/components/Deck";
import { Dumbbell } from "@/components/Dumbbell";
import { FilmTable } from "@/components/FilmTable";
import { countryPt, date, fmt, genrePt, languagePt, monthYear, signed, stars } from "@/lib/format";
import { loadReport, type Person } from "@/lib/report";

const r = loadReport();
const bySlug = Object.fromEntries(r.films.map((f) => [f.slug, f]));
const nameOf = Object.fromEntries(r.members.map((m) => [m.username, m.display_name]));
const newFilms = r.films.filter((f) => !f.presented);
const since = r.since_last_presentation;

function topPeople(people: Person[], topN = 3, maxTotal = 6) {
  if (people.length <= topN) return people;
  const cutoff = people[topN - 1].movie_count;
  const tied = people.filter((p) => p.movie_count >= cutoff);
  return tied.length <= maxTotal ? tied : people.slice(0, maxTotal);
}

/** Um slide de tela cheia. Filhos com `.reveal` entram em sequência quando o slide fica ativo. */
function Slide({
  id,
  title,
  lede,
  className = "",
  children,
}: {
  id: string;
  title?: string;
  lede?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={`slide ${className}`}>
      <div className="slide-inner">
        {title && (
          <header className="section-head reveal">
            <h2>{title}</h2>
            {lede && <p className="lede">{lede}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="stat">
      <span className={`stat-value${/^[\d.,\s]+$/.test(value) ? "" : " is-text"}`}>{value}</span>
      <span className="stat-label">{label}</span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

function People({ people }: { people: Person[] }) {
  return (
    <div className="people-grid reveal">
      {topPeople(people).map((p) => (
        <a key={p.link} className="person" href={p.url} target="_blank" rel="noreferrer">
          <span className="person-photo">
            {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <span className="person-initial">{p.name[0]}</span>}
          </span>
          <span className="person-count">{p.movie_count}</span>
          <span className="person-name">{p.name}</span>
          <span className="person-films">{p.films.join(" · ")}</span>
        </a>
      ))}
    </div>
  );
}

// Rótulos dos slides, na ordem em que aparecem (navegação lateral).
const LABELS = [
  "Abertura",
  "Resumo",
  "Temporada nova",
  "Nossas notas",
  "Afinidade",
  "Gostamos mais",
  "Gostamos menos",
  "Racharam o grupo",
  "Números",
  "Décadas e anos",
  "Atores e atrizes",
  "Direção",
  "Roteiro",
  "Países e idiomas",
  "Gêneros",
  "Temas",
  "Próxima temporada",
  "Todos os filmes",
];

export default function Home() {
  const m = r.metrics;
  const sortedMembers = [...r.members].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  const generous = sortedMembers[0];
  const harsh = sortedMembers[sortedMembers.length - 1];
  const splits = r.divergence.splits.map((s) => bySlug[s]);
  const brazil = r.countries.find((c) => c.country === "Brazil")?.movie_count ?? 0;
  const fewestDecade = [...r.decades].sort((a, b) => a.movie_count - b.movie_count)[0];
  const cage = r.people.actors.find((p) => p.name === "Nicolas Cage")?.movie_count ?? 0;
  const maxAffinity = r.affinity[r.affinity.length - 1].mean_abs_diff;

  return (
    <main>
      <div className="grain" aria-hidden />
      <Deck labels={LABELS} />

      <Slide id="inicio" className="slide-hero">
        <div className="marquee">
          <h1>
            <span>Família</span> <span>Fã de</span> <span>Filmes</span>
          </h1>
          <p className="marquee-bottom">Retrospectiva · {monthYear(r.generated_at.slice(0, 10))}</p>
        </div>
      </Slide>

      <Slide id="resumo" className="opening">
        <div className="hero-numbers reveal">
          <Stat value={fmt(m.movies_watched)} label="filmes" />
          <Stat value={fmt(m.hours_watched, 0)} label="horas de sessão" />
          <Stat value={fmt(m.days_watched, 1)} label="dias inteiros" note="sem pausa pro banheiro" />
          <Stat value={fmt(m.club_age_months / 12, 1)} label="anos de clube" note={`desde ${monthYear(m.club_start)}`} />
          <Stat value={fmt(m.films_per_month, 1)} label="filmes por mês" />
        </div>
        <div className="cast reveal">
          <p className="cast-title">Estrelando</p>
          <ul>
            {r.members.map((mm) => (
              <li key={mm.username}>
                <a href={`https://letterboxd.com/${mm.username}/`} target="_blank" rel="noreferrer">
                  <span className="avatar">
                    {mm.avatar_url ? <img src={mm.avatar_url} alt="" /> : <span>{mm.display_name[0]}</span>}
                  </span>
                  <b>{mm.display_name}</b>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <nav className="toc reveal" aria-label="Seções">
          <a href="#temporada">Temporada nova</a>
          <a href="#notas">Nossas notas</a>
          <a href="#mais">Nós vs. o mundo</a>
          <a href="#numeros">Números</a>
          <a href="#atores">Quem mais apareceu</a>
          <a href="#mundo">Países e idiomas</a>
          <a href="#generos">Gêneros</a>
          <a href="#filmes">Todos os filmes</a>
        </nav>
      </Slide>

      <Slide id="temporada" className="slide-season" title="Filmes desde nov/24">
        <div className="stats-row reveal">
          <Stat value={fmt(since.movies_watched)} label="filmes novos" />
          <Stat value={fmt(since.hours_watched, 0)} label="horas vistas" />
          <Stat value={fmt(since.avg_movie_length, 0)} label="min por filme, em média" />
        </div>
        <div className="stats-row reveal">
          <Stat value={since.name_longest_movie} label={`o mais longo · ${since.duration_longest_movie} min`} />
          <Stat value={since.best_lbxd_rating} label={`o mais bem avaliado no site · ${fmt(since.best_lbxd_rating_value, 2)}`} />
        </div>
        <div className="ribbon reveal" style={{ "--n": newFilms.length } as React.CSSProperties}>
          {/* Lista duplicada para o loop horizontal não ter emenda. */}
          <ol className="ribbon-track">
            {[...newFilms, ...newFilms].map((f, i) => (
              <li key={f.slug + i} aria-hidden={i >= newFilms.length || undefined}>
                <a href={f.url} target="_blank" rel="noreferrer" title={`${f.title} (${f.year})`} tabIndex={i >= newFilms.length ? -1 : undefined}>
                  {f.poster_url ? <img src={f.poster_url} alt={f.title} loading="lazy" /> : <span>{f.title}</span>}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </Slide>

      <Slide
        id="notas"
        title="Nossas notas"
        lede={
          <>
            Nos filmes em que pelo menos {r.min_voters} de nós deram nota, a média do grupo é{" "}
            <b className="accent">{fmt(r.group_avg_overall, 2)}</b>; a do Letterboxd para os mesmos filmes é{" "}
            <b className="site">{fmt(r.lbxd_avg_overall_eligible, 2)}</b>. A gente é mais exigente que a internet.
          </>
        }
      >
        <div className="tickets reveal">
          {r.members.map((mm) => (
            <article key={mm.username} className="ticket">
              <header>
                <h3>{mm.display_name}</h3>
              </header>
              <p className="ticket-avg">
                {fmt(mm.avg_rating ?? 0, 2)}
                <small>nota média</small>
              </p>
              <dl>
                <div><dt>Filmes da lista</dt><dd>{mm.films_seen} de {m.movies_watched}</dd></div>
                <div><dt>Vs. Letterboxd</dt><dd>{signed(mm.avg_diff_vs_lbxd ?? 0)}</dd></div>
                <div><dt>Vs. resto do grupo</dt><dd>{signed(mm.avg_diff_vs_group ?? 0)}</dd></div>
                <div><dt>Favorito</dt><dd>{mm.favorite_film} <span className="stars">{stars(mm.favorite_rating)}</span></dd></div>
                <div><dt>Odiou</dt><dd>{mm.least_favorite_film} <span className="stars">{stars(mm.least_favorite_rating)}</span></dd></div>
              </dl>
            </article>
          ))}
        </div>
      </Slide>

      <Slide id="afinidade" title="Quem pensa parecido" lede="Diferença média de nota entre cada dupla, nos filmes que os dois avaliaram. Quanto menor, mais afinados.">
        <ol className="affinity reveal">
          {r.affinity.map((a) => (
            <li key={`${a.member_a}-${a.member_b}`}>
              <span>
                {nameOf[a.member_a]} <i>&</i> {nameOf[a.member_b]}
              </span>
              <span className="affinity-bar" style={{ width: `${(a.mean_abs_diff / maxAffinity) * 100}%` }} />
              <span className="affinity-value">
                {fmt(a.mean_abs_diff, 2)}★ <small>em {a.common_films} filmes</small>
              </span>
            </li>
          ))}
        </ol>
        <p className="callout reveal">
          <b>{generous.display_name}</b> é quem dá as notas mais altas ({fmt(generous.avg_rating ?? 0, 2)}); <b>{harsh.display_name}</b>, as mais
          baixas ({fmt(harsh.avg_rating ?? 0, 2)}).
        </p>
      </Slide>

      <Slide
        id="mais"
        title="Gostamos mais que o mundo"
        lede={`Média do grupo vs. média do Letterboxd, nos filmes com ${r.min_voters} ou mais notas nossas. Passe o mouse para ver a nota de cada um.`}
      >
        <div className="reveal">
          <Dumbbell films={r.divergence.liked_more.map((s) => bySlug[s])} members={r.members} />
        </div>
      </Slide>

      <Slide id="menos" title="Gostamos menos que o mundo" lede="Os filmes em que ficamos mais abaixo da média do site.">
        <div className="reveal">
          <Dumbbell films={r.divergence.liked_less.map((s) => bySlug[s])} members={r.members} />
        </div>
      </Slide>

      <Slide id="racharam" title="Os filmes que racharam o grupo" lede="Maior desvio-padrão entre as nossas notas. Em destaque, a nota mais alta e a mais baixa de cada filme.">
        <div className="filmtable-scroll reveal">
          <table className="splits">
            <thead>
              <tr>
                <th>Filme</th>
                {r.members.map((mm) => (
                  <th key={mm.username} className="num">
                    {mm.display_name}
                  </th>
                ))}
                <th className="num">Desvio</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((f) => {
                const vals = Object.values(f.ratings).filter((v): v is number => v != null);
                const hi = Math.max(...vals);
                const lo = Math.min(...vals);
                return (
                  <tr key={f.slug}>
                    <td>
                      <a href={f.url} target="_blank" rel="noreferrer">
                        {f.title}
                      </a>{" "}
                      <small className="muted">{f.year}</small>
                    </td>
                    {r.members.map((mm) => {
                      const v = f.ratings[mm.username];
                      return (
                        <td key={mm.username} className={`num ${v === hi ? "up" : v === lo ? "down" : ""}`}>
                          {v != null ? stars(v) : <span className="muted">·</span>}
                        </td>
                      );
                    })}
                    <td className="num strong">{fmt(f.group_std ?? 0, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Slide>

      <Slide id="numeros" title="Os números da sessão">
        <div className="stats-row reveal">
          <Stat value={fmt(m.minutes_watched)} label="minutos assistidos" />
          <Stat value={fmt(m.avg_movie_length, 0)} label="min de duração média" />
          <Stat value={fmt(m.avg_lbxd_rating, 2)} label="nota média no Letterboxd" />
        </div>
        <div className="stats-row reveal">
          <Stat value={m.name_longest_movie} label={`o mais longo · ${m.duration_longest_movie} min`} />
          <Stat value={m.name_shortest_movie} label={`o mais curto · ${m.duration_shortest_movie} min`} />
          <Stat value={m.best_lbxd_rating} label={`melhor nota no site · ${fmt(m.best_lbxd_rating_value, 2)}`} />
          <Stat value={m.worst_lbxd_rating} label={`pior nota no site · ${fmt(m.worst_lbxd_rating_value, 2)}`} />
        </div>
      </Slide>

      <Slide id="decadas" title="De quando são, quando vimos">
        <div className="two-col reveal">
          <BarList caption="Filmes por década de lançamento" items={r.decades.map((d) => ({ label: `${d.release_decade}s`, value: d.movie_count }))} />
          <BarList caption="Filmes por ano de sessão" items={r.years_watched.map((y) => ({ label: String(y.year), value: y.movie_count }))} />
        </div>
      </Slide>

      <Slide id="atores" title="Quem mais apareceu na nossa tela" lede="Atores e atrizes com mais filmes na lista.">
        <People people={r.people.actors} />
      </Slide>

      <Slide id="direcao" title="Atrás da câmera" lede="Quem mais dirigiu o que a gente viu.">
        <People people={r.people.directors} />
      </Slide>

      <Slide id="roteiro" title="Quem escreveu" lede="Roteiristas com mais filmes na lista.">
        <People people={r.people.writers} />
      </Slide>

      <Slide id="mundo" title="Países, idiomas e estúdios">
        <div className="three-col reveal">
          <BarList caption="Países" items={r.countries.slice(0, 12).map((c) => ({ label: countryPt(c.country), value: c.movie_count }))} />
          <BarList caption="Idiomas" items={r.languages.slice(0, 12).map((l) => ({ label: languagePt(l.language), value: l.movie_count }))} />
          <BarList caption="Estúdios (3+ filmes)" items={r.studios.slice(0, 12).map((s) => ({ label: s.studio, value: s.movie_count }))} />
        </div>
      </Slide>

      <Slide id="generos" title="Do que a gente gosta">
        <div className="two-col reveal">
          <BarList caption="Gênero principal de cada filme" items={r.genres_primary.map((g) => ({ label: genrePt(g.genre), value: g.movie_count }))} />
          <BarList caption="Todos os gêneros marcados" items={r.genres_all.map((g) => ({ label: genrePt(g.genre), value: g.movie_count }))} />
        </div>
      </Slide>

      <Slide id="temas" title="Os temas que mais voltam" lede="Os 20 temas mais frequentes, com os nomes do Letterboxd.">
        <div className="two-col reveal">
          <BarList items={r.themes.slice(0, 10).map((t) => ({ label: t.theme, value: t.movie_count }))} max={r.themes[0].movie_count} />
          <BarList items={r.themes.slice(10, 20).map((t) => ({ label: t.theme, value: t.movie_count }))} max={r.themes[0].movie_count} />
        </div>
      </Slide>

      <Slide id="futuro" title="Sugestões pra próxima temporada">
        <ul className="suggestions reveal">
          <li>
            Só {fewestDecade.movie_count} filme{fewestDecade.movie_count > 1 ? "s" : ""} dos anos {fewestDecade.release_decade}: tá na hora de cavar mais
            fundo no arquivo.
          </li>
          <li>
            {brazil} filmes brasileiros em {m.movies_watched}. Dá pra valorizar mais a indústria nacional.
          </li>
          <li>Nicolas Cage segue no topo com {cage} filmes. Manter a liderança é responsabilidade de todos.</li>
          <li>Mais filmes dirigidos por mulheres.</li>
          <li>Todo mundo logar e dar nota no Letterboxd, senão a média do grupo fica com cara de média de três.</li>
        </ul>
      </Slide>

      <Slide id="filmes" className="slide-table" title="Todos os filmes" lede="Na ordem em que vimos. Clique no cabeçalho para ordenar; os da temporada nova estão marcados.">
        <div className="reveal slide-fill">
          <FilmTable films={r.films} members={r.members} />
        </div>
        <footer className="footer">
          Dados raspados do <a href={r.list_url}>Letterboxd</a> em {date(r.generated_at.slice(0, 10))}. Notas em estrelas (0,5 a 5); fotos via TMDB.
        </footer>
      </Slide>
    </main>
  );
}
