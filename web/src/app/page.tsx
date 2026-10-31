import { BarList } from "@/components/BarList";
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

function Section({ id, kicker, title, children, lede }: { id: string; kicker: string; title: string; lede?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="section">
      <header className="section-head">
        <p className="kicker">{kicker}</p>
        <h2>{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </header>
      {children}
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

function People({ title, people }: { title: string; people: Person[] }) {
  const top = topPeople(people);
  return (
    <div className="people">
      <h3>{title}</h3>
      <div className="people-grid">
        {top.map((p) => (
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
      <details className="more">
        <summary>Ranking completo ({people.length})</summary>
        <BarList items={people.map((p) => ({ label: p.name, value: p.movie_count, hint: p.films.join(", ") }))} />
      </details>
    </div>
  );
}

export default function Home() {
  const m = r.metrics;
  const sortedMembers = [...r.members].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  const generous = sortedMembers[0];
  const harsh = sortedMembers[sortedMembers.length - 1];
  const splits = r.divergence.splits.map((s) => bySlug[s]);
  const brazil = r.countries.find((c) => c.country === "Brazil")?.movie_count ?? 0;
  const fewestDecade = [...r.decades].sort((a, b) => a.movie_count - b.movie_count)[0];
  const cage = r.people.actors.find((p) => p.name === "Nicolas Cage")?.movie_count ?? 0;

  return (
    <main>
      <div className="grain" aria-hidden />

      <header className="hero">
        <div className="marquee">
          <h1>
            <span>Família</span> <span>Fã de</span> <span>Filmes</span>
          </h1>
          <p className="marquee-bottom">Retrospectiva · {monthYear(r.generated_at.slice(0, 10))}</p>
        </div>
        <div className="hero-numbers">
          <Stat value={fmt(m.movies_watched)} label="filmes" />
          <Stat value={fmt(m.hours_watched, 0)} label="horas de sessão" />
          <Stat value={fmt(m.days_watched, 1)} label="dias inteiros" note="sem pausa pro banheiro" />
        </div>
        <p className="hero-cast">
          Estrelando {r.members.map((mm, i) => (
            <span key={mm.username}>
              {i > 0 && (i === r.members.length - 1 ? " e " : ", ")}
              <b>{mm.display_name}</b>
            </span>
          ))}
          .
        </p>
        <nav className="toc" aria-label="Seções">
          <a href="#temporada">Temporada nova</a>
          <a href="#notas">Nossas notas</a>
          <a href="#divergencias">Nós vs. o mundo</a>
          <a href="#numeros">Números</a>
          <a href="#gente">Quem mais apareceu</a>
          <a href="#mundo">Países e idiomas</a>
          <a href="#generos">Gêneros</a>
          <a href="#filmes">Todos os filmes</a>
        </nav>
      </header>

      <Section
        id="temporada"
        kicker="Desde a última apresentação"
        title={`${since.movies_watched} filmes depois de ${r.last_presented.title}`}
        lede={
          <>
            A última retrospectiva parou no filme nº {r.last_presented.position}. De {date(since.first_date)} a {date(since.last_date)} vimos mais{" "}
            {fmt(since.hours_watched, 0)} horas de cinema
            {since.hours_watched > r.metrics.hours_watched - since.hours_watched ? ": mais do que tudo o que tinha rolado até então." : "."}
          </>
        }
      >
        <div className="stats-row">
          <Stat value={fmt(since.movies_watched)} label="filmes novos" />
          <Stat value={fmt(since.avg_movie_length, 0)} label="min por filme, em média" />
          <Stat value={since.name_longest_movie} label={`o mais longo · ${since.duration_longest_movie} min`} />
          <Stat value={since.best_lbxd_rating} label={`o mais bem avaliado no site · ${fmt(since.best_lbxd_rating_value, 2)}`} />
        </div>
        <ol className="posters">
          {newFilms.map((f) => (
            <li key={f.slug}>
              <a href={f.url} target="_blank" rel="noreferrer" title={`${f.title} (${f.year})`}>
                {f.poster_url ? <img src={f.poster_url} alt={f.title} loading="lazy" /> : <span>{f.title}</span>}
              </a>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="notas"
        kicker="Novidade"
        title="Nossas notas"
        lede={
          <>
            Nos filmes em que pelo menos {r.min_voters} de nós deram nota, a média do grupo é{" "}
            <b className="accent">{fmt(r.group_avg_overall, 2)}</b>; a do Letterboxd para os mesmos filmes é{" "}
            <b className="site">{fmt(r.lbxd_avg_overall_eligible, 2)}</b>. A gente é mais exigente que a internet.
          </>
        }
      >
        <div className="tickets">
          {r.members.map((mm) => (
            <article key={mm.username} className="ticket">
              <header>
                <h3>{mm.display_name}</h3>
                <a href={`https://letterboxd.com/${mm.username}/`} target="_blank" rel="noreferrer">@{mm.username}</a>
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
        <p className="callout">
          <b>{generous.display_name}</b> é quem dá as notas mais altas ({fmt(generous.avg_rating ?? 0, 2)}); <b>{harsh.display_name}</b>, as mais baixas (
          {fmt(harsh.avg_rating ?? 0, 2)}).
        </p>

        <h3 className="subhead">Quem pensa parecido</h3>
        <p className="muted small">Diferença média de nota entre cada dupla, nos filmes que os dois avaliaram. Quanto menor, mais afinados.</p>
        <ol className="affinity">
          {r.affinity.map((a) => (
            <li key={`${a.member_a}-${a.member_b}`}>
              <span>
                {nameOf[a.member_a]} <i>&</i> {nameOf[a.member_b]}
              </span>
              <span className="affinity-bar" style={{ width: `${(a.mean_abs_diff / r.affinity[r.affinity.length - 1].mean_abs_diff) * 100}%` }} />
              <span className="affinity-value">
                {fmt(a.mean_abs_diff, 2)}★ <small>em {a.common_films} filmes</small>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="divergencias"
        kicker="Nós vs. o mundo"
        title="Onde a gente discorda do Letterboxd"
        lede={`Diferença entre a média do grupo e a média do site, só nos filmes com ${r.min_voters} ou mais notas nossas. Passe o mouse para ver a nota de cada um.`}
      >
        <div className="two-col">
          <div>
            <h3 className="subhead up">Gostamos mais que a média</h3>
            <Dumbbell films={r.divergence.liked_more.map((s) => bySlug[s])} members={r.members} />
          </div>
          <div>
            <h3 className="subhead down">Gostamos menos que a média</h3>
            <Dumbbell films={r.divergence.liked_less.map((s) => bySlug[s])} members={r.members} />
          </div>
        </div>

        <h3 className="subhead">Os filmes que racharam o grupo</h3>
        <p className="muted small">Maior desvio-padrão entre as nossas notas.</p>
        <div className="filmtable-scroll">
          <table className="splits">
            <thead>
              <tr>
                <th>Filme</th>
                {r.members.map((mm) => (
                  <th key={mm.username} className="num">{mm.display_name}</th>
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
                      <a href={f.url} target="_blank" rel="noreferrer">{f.title}</a> <small className="muted">{f.year}</small>
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
      </Section>

      <Section id="numeros" kicker="Dados gerais" title="Os números da sessão">
        <div className="stats-row">
          <Stat value={fmt(m.minutes_watched)} label="minutos assistidos" />
          <Stat value={fmt(m.avg_movie_length, 0)} label="min de duração média" />
          <Stat value={fmt(m.avg_lbxd_rating, 2)} label="nota média no Letterboxd" />
        </div>
        <div className="stats-row">
          <Stat value={m.name_longest_movie} label={`o mais longo · ${m.duration_longest_movie} min`} />
          <Stat value={m.name_shortest_movie} label={`o mais curto · ${m.duration_shortest_movie} min`} />
          <Stat value={m.best_lbxd_rating} label={`melhor nota no site · ${fmt(m.best_lbxd_rating_value, 2)}`} />
          <Stat value={m.worst_lbxd_rating} label={`pior nota no site · ${fmt(m.worst_lbxd_rating_value, 2)}`} />
        </div>
        <div className="two-col">
          <BarList caption="Filmes por década de lançamento" items={r.decades.map((d) => ({ label: `${d.release_decade}s`, value: d.movie_count }))} />
          <BarList caption="Filmes por ano de sessão" items={r.years_watched.map((y) => ({ label: String(y.year), value: y.movie_count }))} />
        </div>
      </Section>

      <Section id="gente" kicker="Elenco e equipe" title="Quem mais apareceu na nossa tela">
        <People title="Atores e atrizes" people={r.people.actors} />
        <People title="Direção" people={r.people.directors} />
        <People title="Roteiro" people={r.people.writers} />
      </Section>

      <Section id="mundo" kicker="Geografia" title="Países, idiomas e estúdios">
        <div className="three-col">
          <BarList caption="Países" items={r.countries.slice(0, 12).map((c) => ({ label: countryPt(c.country), value: c.movie_count }))} />
          <BarList caption="Idiomas" items={r.languages.slice(0, 12).map((l) => ({ label: languagePt(l.language), value: l.movie_count }))} />
          <BarList caption="Estúdios (3+ filmes)" items={r.studios.slice(0, 12).map((s) => ({ label: s.studio, value: s.movie_count }))} />
        </div>
      </Section>

      <Section id="generos" kicker="Gêneros e temas" title="Do que a gente gosta">
        <div className="two-col">
          <BarList caption="Gênero principal de cada filme" items={r.genres_primary.map((g) => ({ label: genrePt(g.genre), value: g.movie_count }))} />
          <BarList caption="Todos os gêneros marcados" items={r.genres_all.map((g) => ({ label: genrePt(g.genre), value: g.movie_count }))} />
        </div>
        <BarList caption="Os 20 temas mais frequentes (nomes do Letterboxd)" items={r.themes.map((t) => ({ label: t.theme, value: t.movie_count }))} />
      </Section>

      <Section id="futuro" kicker="Roadmap" title="Sugestões pra próxima temporada">
        <ul className="suggestions">
          <li>
            Só {fewestDecade.movie_count} filme{fewestDecade.movie_count > 1 ? "s" : ""} dos anos {fewestDecade.release_decade}: tá na hora de cavar mais fundo no arquivo.
          </li>
          <li>{brazil} filmes brasileiros em {m.movies_watched}. Dá pra valorizar mais a indústria nacional.</li>
          <li>Nicolas Cage segue no topo com {cage} filmes. Manter a liderança é responsabilidade de todos.</li>
          <li>Mais filmes dirigidos por mulheres.</li>
          <li>Todo mundo logar e dar nota no Letterboxd, senão a média do grupo fica com cara de média de três.</li>
        </ul>
      </Section>

      <Section id="filmes" kicker="Arquivo" title="Todos os filmes" lede="A lista completa, na ordem em que vimos. Clique no cabeçalho para ordenar; os da temporada nova estão marcados.">
        <FilmTable films={r.films} members={r.members} />
      </Section>

      <footer className="footer">
        <p>
          Dados raspados do <a href={r.list_url}>Letterboxd</a> em {date(r.generated_at.slice(0, 10))}. Notas em estrelas (0,5 a 5); fotos via TMDB.
        </p>
      </footer>
    </main>
  );
}
