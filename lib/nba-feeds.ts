import { XMLParser } from "fast-xml-parser";
import { decode } from "he";
import { unstable_cache } from "next/cache";
import { normalizeSpanish, type NewsEdition, type NewsHeadline } from "./nba";

const feeds = {
  as: {
    url: "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/baloncesto/subsection/nba/",
    source: "Diario AS",
    hosts: ["as.com", "www.as.com", "mexico.as.com", "us.as.com"],
  },
  nba: {
    url: "https://www.nbamaniacs.com/noticias/feed/",
    source: "NBAManiacs",
    hosts: ["www.nbamaniacs.com", "nbamaniacs.com"],
  },
  rumors: {
    url: "https://www.nbamaniacs.com/rumores-nba/feed/",
    source: "NBAManiacs",
    hosts: ["www.nbamaniacs.com", "nbamaniacs.com"],
  },
  toronto: {
    url: "https://www.nbamaniacs.com/toronto-raptors/feed/",
    source: "NBAManiacs",
    hosts: ["www.nbamaniacs.com", "nbamaniacs.com"],
  },
} as const;

type FeedId = keyof typeof feeds;
type RawItem = { title?: unknown; link?: unknown; pubDate?: unknown; category?: unknown[] };
const day = 24 * 60 * 60 * 1000;
const maxFeedBytes = 2 * 1024 * 1024;
const parser = new XMLParser({
  ignoreAttributes: true,
  ignoreDeclaration: true,
  parseTagValue: false,
  processEntities: false,
  isArray: name => name === "item" || name === "category",
});

function text(value: unknown) {
  return typeof value === "string" ? decode(value).replace(/<\/?[a-z][^>]*>/gi, "").trim() : "";
}

function articleUrl(raw: unknown, feed: FeedId): string | null {
  try {
    const url = new URL(text(raw));
    const hosts: readonly string[] = feeds[feed].hosts;
    if (url.protocol !== "https:" || url.port || url.username || url.password || !hosts.includes(url.hostname)) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function categorize(title: string, tags: string, url: string, feed: FeedId) {
  if (feed === "rumors" || url.includes("/rumores-nba/") || tags.includes("rumores nba")) return "rumor";
  if (/\b(rumores? (?:de|sobre)|segun los rumores|posible traspaso|podria (?:fichar|recalar|firmar|ser traspasado)|en la orbita de)\b/.test(title)) return "rumor";
  return "news";
}

export function parseFeed(xml: string, feed: FeedId): NewsHeadline[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unexpected RSS declaration");
  const document = parser.parse(xml) as { rss?: { channel?: { item?: RawItem[] } } };
  if (!document.rss?.channel) throw new Error("Invalid NBA RSS");
  const articles: NewsHeadline[] = [];
  for (const item of (document.rss.channel.item ?? []).slice(0, 50)) {
    const title = text(item.title).replace(/\s+/g, " ");
    const publishedAt = Date.parse(text(item.pubDate));
    const url = articleUrl(item.link, feed);
    if (!title || title.length > 320 || !Number.isFinite(publishedAt) || !url) continue;
    const normalized = normalizeSpanish(title);
    const tags = normalizeSpanish((item.category ?? []).map(text).join(" "));
    if (/\b(apuestas|cuotas de apuestas|casino)\b/.test(normalized + " " + tags)) continue;
    articles.push({
      title, url, publishedAt, source: feeds[feed].source,
      kind: categorize(normalized, tags, url, feed),
      raptors: feed === "toronto" || /\b(?:toronto|raptors)\b/.test(normalized + " " + tags),
    });
  }
  return articles;
}

async function readBounded(response: Response) {
  if (!response.body || Number(response.headers.get("content-length")) > maxFeedBytes) throw new Error("RSS response exceeds limit");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > maxFeedBytes) {
        await reader.cancel();
        throw new Error("RSS response exceeds limit");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

const cachedFeed = unstable_cache(async (feed: FeedId) => {
  const response = await fetch(feeds[feed].url, {
    cache: "no-store",
    signal: AbortSignal.timeout(6500),
    redirect: "error",
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Cancha RSS Reader/1.0" },
  });
  if (!response.ok) throw new Error("NBA feed response " + response.status);
  return { headlines: parseFeed(await readBounded(response), feed), checkedAt: Date.now() };
}, ["cancha-nba-publisher-feed-v1"], { revalidate: 900 });

export function mergeHeadlines(entries: NewsHeadline[], now = Date.now()) {
  const byUrl = new Map<string, NewsHeadline>();
  for (const entry of entries) {
    if (entry.publishedAt < now - 21 * day || entry.publishedAt > now + 15 * 60 * 1000) continue;
    const existing = byUrl.get(entry.url);
    byUrl.set(entry.url, existing ? {
      ...(entry.publishedAt >= existing.publishedAt ? entry : existing),
      kind: existing.kind === "rumor" || entry.kind === "rumor" ? "rumor" : "news",
      raptors: existing.raptors || entry.raptors,
    } : entry);
  }
  const seen = new Set<string>();
  return Array.from(byUrl.values()).sort((a, b) => b.publishedAt - a.publishedAt).filter(entry => {
    const key = normalizeSpanish(entry.title).replace(/[^\p{Letter}\p{Number}]/gu, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getNbaEdition(): Promise<NewsEdition> {
  const results = await Promise.allSettled((Object.keys(feeds) as FeedId[]).map(feed => cachedFeed(feed)));
  const available = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  const headlines = mergeHeadlines(available.flatMap(result => result.headlines));
  return {
    headlines,
    checkedAt: available.length ? Math.min(...available.map(result => result.checkedAt)) : null,
    unavailable: results.length - available.length,
  };
}
