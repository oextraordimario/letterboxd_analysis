import { readFileSync } from "node:fs";
import path from "node:path";

export type Metrics = {
  movies_watched: number;
  minutes_watched: number;
  hours_watched: number;
  days_watched: number;
  avg_movie_length: number;
  name_longest_movie: string;
  duration_longest_movie: number;
  name_shortest_movie: string;
  duration_shortest_movie: number;
  avg_lbxd_rating: number;
  best_lbxd_rating: string;
  best_lbxd_rating_value: number;
  worst_lbxd_rating: string;
  worst_lbxd_rating_value: number;
};

export type Film = {
  position: number;
  slug: string;
  title: string;
  year: number;
  duration: number;
  url: string;
  poster_url: string | null;
  lbxd_avg: number;
  lbxd_rating_count: number;
  watched_date: string | null;
  presented: boolean;
  ratings: Record<string, number | null>;
  group_avg: number | null;
  group_voters: number;
  group_std: number | null;
  diff_vs_lbxd: number | null;
};

export type Member = {
  username: string;
  display_name: string;
  films_seen: number;
  films_rated: number;
  avg_rating: number | null;
  avg_diff_vs_lbxd: number | null;
  avg_diff_vs_group: number | null;
  favorite_film: string | null;
  favorite_rating: number | null;
  least_favorite_film: string | null;
  least_favorite_rating: number | null;
};

export type Person = {
  name: string;
  movie_count: number;
  link: string;
  url: string;
  image_url: string | null;
  films: string[];
};

export type Report = {
  generated_at: string;
  list_url: string;
  min_voters: number;
  last_presented: { position: number; title: string };
  metrics: Metrics;
  since_last_presentation: Metrics & { first_date: string; last_date: string };
  members: Member[];
  affinity: { member_a: string; member_b: string; common_films: number; mean_abs_diff: number }[];
  films: Film[];
  divergence: { liked_more: string[]; liked_less: string[]; splits: string[] };
  group_avg_overall: number;
  lbxd_avg_overall_eligible: number;
  decades: { release_decade: number; movie_count: number }[];
  years_watched: { year: number; movie_count: number }[];
  people: { actors: Person[]; directors: Person[]; writers: Person[] };
  countries: { country: string; movie_count: number }[];
  languages: { language: string; movie_count: number }[];
  studios: { studio: string; movie_count: number }[];
  genres_all: { genre: string; movie_count: number }[];
  genres_primary: { genre: string; movie_count: number }[];
  themes: { theme: string; movie_count: number }[];
};

// Lido no build (export estático). O arquivo é gerado por `python -m pipeline.build_analytics`.
export function loadReport(): Report {
  const file = path.join(process.cwd(), "..", "data", "analytics", "report.json");
  return JSON.parse(readFileSync(file, "utf-8"));
}
