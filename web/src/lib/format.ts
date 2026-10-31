const num = (digits: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmt = (value: number, digits = 0) => num(digits).format(value);

export const signed = (value: number, digits = 2) => (value > 0 ? "+" : value < 0 ? "−" : "±") + fmt(Math.abs(value), digits);

export function stars(rating: number | null | undefined): string {
  if (rating == null) return "—";
  const full = Math.floor(rating);
  return "★".repeat(full) + (rating - full >= 0.5 ? "½" : "");
}

export function date(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

export function monthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
}

const GENRES: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Animation: "Animação",
  Comedy: "Comédia",
  Crime: "Crime",
  Documentary: "Documentário",
  Drama: "Drama",
  Family: "Família",
  Fantasy: "Fantasia",
  History: "História",
  Horror: "Terror",
  Music: "Música",
  Mystery: "Mistério",
  Romance: "Romance",
  "Science Fiction": "Ficção científica",
  Thriller: "Suspense",
  "TV Movie": "Filme de TV",
  War: "Guerra",
  Western: "Faroeste",
};

const COUNTRIES: Record<string, string> = {
  USA: "EUA",
  UK: "Reino Unido",
  France: "França",
  Germany: "Alemanha",
  Japan: "Japão",
  Canada: "Canadá",
  China: "China",
  "Hong Kong": "Hong Kong",
  Brazil: "Brasil",
  Italy: "Itália",
  Spain: "Espanha",
  "South Korea": "Coreia do Sul",
  Australia: "Austrália",
  "New Zealand": "Nova Zelândia",
  Mexico: "México",
  Ireland: "Irlanda",
  Sweden: "Suécia",
  Hungary: "Hungria",
  Belgium: "Bélgica",
  Taiwan: "Taiwan",
  India: "Índia",
  Czechia: "Tchéquia",
  Czechoslovakia: "Tchecoslováquia",
  Denmark: "Dinamarca",
  Norway: "Noruega",
  Netherlands: "Países Baixos",
  Argentina: "Argentina",
  Luxembourg: "Luxemburgo",
  Switzerland: "Suíça",
  Poland: "Polônia",
  Austria: "Áustria",
  "South Africa": "África do Sul",
};

const LANGUAGES: Record<string, string> = {
  English: "Inglês",
  Spanish: "Espanhol",
  Japanese: "Japonês",
  French: "Francês",
  German: "Alemão",
  Cantonese: "Cantonês",
  Mandarin: "Mandarim",
  Portuguese: "Português",
  Italian: "Italiano",
  Korean: "Coreano",
  Russian: "Russo",
  Latin: "Latim",
  Arabic: "Árabe",
  Czech: "Tcheco",
  Hungarian: "Húngaro",
  Swedish: "Sueco",
  Chinese: "Chinês",
  "No spoken language": "Sem diálogos",
  Hindi: "Hindi",
  Telugu: "Telugu",
  Polish: "Polonês",
  Greek: "Grego",
  Hebrew: "Hebraico",
  Danish: "Dinamarquês",
  Norwegian: "Norueguês",
  Dutch: "Holandês",
};

export const genrePt = (g: string) => GENRES[g] ?? g;
export const countryPt = (c: string) => COUNTRIES[c] ?? c;
export const languagePt = (l: string) => LANGUAGES[l] ?? l;
