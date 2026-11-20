"use client";

import { BookOpen, Newspaper, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { type NewsEdition, type NewsHeadline, type NewsKind, normalizeSpanish } from "@/lib/nba";

const articleDate = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "America/Toronto" });
const checkDate = new Intl.DateTimeFormat("es", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto",
});

const glossary = [
  { word: "el traspaso", meaning: "trade", pattern: /\btraspas(?:o|os|ad[oa]s?)\b/ },
  { word: "la baja", meaning: "player being out", pattern: /\b(?:baja|bajas|lesion|lesiones|ausencia)\b/ },
  { word: "la racha", meaning: "streak", pattern: /\brachas?\b/ },
  { word: "el fichaje", meaning: "signing", pattern: /\bfich(?:a|ar|aje|ajes)\b/ },
  { word: "el mate", meaning: "dunk", pattern: /\bmates?\b/ },
  { word: "la prórroga", meaning: "overtime", pattern: /\bprorrogas?\b/ },
  { word: "el rebote", meaning: "rebound", pattern: /\brebotes?\b/ },
  { word: "el alero", meaning: "forward", pattern: /\baleros?\b/ },
] as const;

function Headline({ article }: { article: NewsHeadline }) {
  const word = glossary.find(entry => entry.pattern.test(normalizeSpanish(article.title)));
  const isRumor = article.kind === "rumor";
  return <article className="panel news-card">
    <div className="news-meta">
      <span className={isRumor ? "news-label rumor-label" : "news-label"}>{isRumor ? "Rumor · sin confirmar" : "Noticia"}</span>
      {article.raptors && <span>Toronto Raptors</span>}
    </div>
    <h2><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h2>
    <p className="news-source"><span>{article.source}</span><time dateTime={new Date(article.publishedAt).toISOString()}>{articleDate.format(article.publishedAt)}</time></p>
    {word && <p className="news-word"><strong>{word.word}</strong><span lang="en">{word.meaning}</span></p>}
  </article>;
}

export function NbaNews({ onBack }: { onBack: () => void }) {
  const [edition, setEdition] = useState<NewsEdition>();
  const [kind, setKind] = useState<NewsKind>("news");
  const [raptors, setRaptors] = useState(false);
  const [count, setCount] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/nba", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("NBA feed unavailable");
        return await response.json() as NewsEdition;
      })
      .then(value => { if (!controller.signal.aborted) setEdition(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [refresh]);

  function reload() {
    setFailed(false);
    setPending(true);
    setRefresh(value => value + 1);
  }

  const matches = edition?.headlines.filter(article => article.kind === kind && (!raptors || article.raptors)) ?? [];

  return <section className="nba-section" lang="es" aria-labelledby="nba-title">
    <header className="nba-heading">
      <div>
        <button type="button" className="text-button back" onClick={onBack}>Volver al inicio</button>
        <p className="overline"><Newspaper size={17} /> Actualidad del baloncesto</p>
        <h1 id="nba-title">NBA en español</h1>
      </div>
      <div className="nba-update">
        {edition?.checkedAt && <p>Consultado el {checkDate.format(edition.checkedAt)} (Toronto)</p>}
        {(edition || failed) && <button type="button" className="button secondary" onClick={reload} disabled={pending}><RefreshCw size={16} /> {pending ? "Consultando…" : "Volver a consultar"}</button>}
      </div>
    </header>
    <div className="nba-controls">
      <div className="news-filters" role="group" aria-label="Tipo de titular">
        <button type="button" aria-pressed={kind === "news"} onClick={() => { setKind("news"); setCount(10); }}>Noticias</button>
        <button type="button" aria-pressed={kind === "rumor"} onClick={() => { setKind("rumor"); setCount(10); }}>Rumores</button>
      </div>
      <div className="news-filters" role="group" aria-label="Equipo">
        <button type="button" aria-pressed={!raptors} onClick={() => { setRaptors(false); setCount(10); }}>Toda la NBA</button>
        <button type="button" aria-pressed={raptors} onClick={() => { setRaptors(true); setCount(10); }}>Toronto Raptors</button>
      </div>
    </div>
    {kind === "rumor" && <p className="nba-context">Informaciones que los equipos o la liga todavía no han confirmado oficialmente.</p>}
    {failed && <p className="notice error" role="alert">{edition ? "No se pudo actualizar. Puedes leer los titulares de la última consulta." : "No se pudieron cargar los titulares. Vuelve a intentarlo en un momento."}</p>}
    {!!edition?.unavailable && !failed && <p className="nba-context">Algunas fuentes tardaron en responder. Mostramos los titulares disponibles.</p>}
    <div className="nba-layout">
      <div className="nba-list" aria-busy={pending}>
        {pending && !edition && <p className="panel news-empty" role="status">Cargando titulares…</p>}
        {edition && !matches.length && <p className="panel news-empty" role="status">
          {kind === "rumor" ? "No hay rumores recientes en esta selección." : "No hay noticias recientes en esta selección."}
        </p>}
        {matches.slice(0, count).map(article => <Headline key={article.url} article={article} />)}
        {matches.length > count && <button type="button" className="button secondary" onClick={() => setCount(value => value + 10)}>Mostrar más titulares</button>}
      </div>
      <aside className="panel nba-reading" aria-labelledby="nba-reading-title">
        <span className="panel-icon"><BookOpen size={20} /></span>
        <h2 id="nba-reading-title">Del titular a la cancha</h2>
        <p>{kind === "rumor" ? "Completa en voz alta: «Según el medio, el equipo podría…»." : "Lee un titular y resume en una frase qué pasó y a quién."}</p>
        <dl>
          {glossary.slice(0, 4).map(entry => <div key={entry.word}><dt>{entry.word}</dt><dd lang="en">{entry.meaning}</dd></div>)}
        </dl>
      </aside>
    </div>
  </section>;
}
