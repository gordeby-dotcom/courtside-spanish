export type NewsKind = "news" | "rumor";

export type NewsHeadline = {
  title: string;
  url: string;
  publishedAt: number;
  kind: NewsKind;
  source: "Diario AS" | "NBAManiacs";
  raptors: boolean;
};

export type NewsEdition = {
  headlines: NewsHeadline[];
  checkedAt: number | null;
  unavailable: number;
};

export function normalizeSpanish(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
