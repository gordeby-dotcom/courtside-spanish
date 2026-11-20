"use client";

import { StudentInvitation } from "./access-form";
import { NbaNews } from "./nba-news";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BookOpen, Check, Clock3, Lightbulb, ListPlus, LockKeyhole, LogOut, Newspaper, RotateCcw } from "lucide-react";
import {
  exercisesFor, focusLabels, starterTopic, suggestTopic,
  type Focus, type HomeView, type RunView, type Topic,
} from "@/lib/lesson";

type Pane = "home" | "topics" | "add" | "preview" | "practice" | "nba";
type Custom = {
  scene: string; sentence: string; cue: string; answer: string; hint: string;
  alternateScene: string; alternateSentence: string;
};
const emptyExercise: Custom = {
  scene: "", sentence: "", cue: "", answer: "", hint: "", alternateScene: "", alternateSentence: "",
};

async function api<T>(query = "", data?: object): Promise<T> {
  const response = await fetch("/api/tutor" + query, data ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  } : { cache: "no-store" });
  const result = await response.json().catch(() => ({ error: "Cancha could not load. Try again." }));
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error
      : "Something went wrong. Try again.";
    throw new Error(message);
  }
  return result as T;
}

function Ball({ size = 23 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9.1" />
    <path d="M3 12h18M12 3v18M6.3 4.8c5 3.5 5 10.9 0 14.4m11.4-14.4c-5 3.5-5 10.9 0 14.4" />
  </svg>;
}

function CourtMark() {
  return <div className="court-mark" aria-hidden="true"><i /><b /><span /></div>;
}

function Heading({ onBack, children, label }: { onBack: () => void; children: ReactNode; label: string }) {
  return <div className="section-heading">
    <button className="text-button back" type="button" onClick={onBack}>Back to {label.toLowerCase()}</button>
    <h1>{children}</h1>
  </div>;
}

function ErrorNote({ message }: { message: string }) {
  return message ? <p role="alert" className="notice error">{message}</p> : null;
}

export function Tutor() {
  const [home, setHome] = useState<HomeView | null>(null);
  const [pane, setPane] = useState<Pane>("home");
  const [run, setRun] = useState<RunView>();
  const [selected, setSelected] = useState<Topic>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    api<HomeView>().then(value => { if (active) setHome(value); })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  const topics = home?.topics ?? [starterTopic];
  const topic = topics[0];
  const student = home?.role === "student";

  function navigate(next: Pane) {
    setError("");
    setPane(next);
    window.scrollTo(0, 0);
    if (next !== "practice") main.current?.focus();
  }

  async function openRun(topicOrSession: string, resume = false) {
    setBusy(true);
    setError("");
    try {
      const next = resume
        ? await api<RunView>("?session=" + encodeURIComponent(topicOrSession))
        : await api<RunView>("", { action: "start", topic: topicOrSession });
      setRun(next);
      navigate("practice");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function preview(value: Topic) {
    setSelected(value);
    navigate("preview");
  }

  async function returnHome() {
    navigate("home");
    if (home) {
      try { setHome(await api<HomeView>()); }
      catch (reason) { setError((reason as Error).message); }
    }
  }

  function added(value: Topic) {
    setHome(current => current ? { ...current, topics: [value, ...current.topics] } : current);
    preview(value);
  }

  return <>
    <header className="site-header">
      <div className="shell header-inner">
        <button className="brand" type="button" onClick={returnHome} aria-label="Cancha home">
          <span className="brand-mark"><Ball /></span>
          <span className="wordmark">CANCHA<span>COURTSIDE SPANISH</span></span>
        </button>
        {!!home && <nav aria-label="Main navigation">
          <button className={pane === "home" || pane === "practice" ? "active" : ""} onClick={returnHome} aria-current={pane === "home" ? "page" : undefined}>{student ? "Practice" : "Home"}</button>
          <button className={pane !== "home" && pane !== "practice" && pane !== "nba" ? "active" : ""} onClick={() => navigate("topics")} aria-current={pane === "topics" ? "page" : undefined}>Class topics</button>
          <button className={pane === "nba" ? "active" : ""} onClick={() => navigate("nba")} aria-current={pane === "nba" ? "page" : undefined} lang="es">NBA en español</button>
        </nav>}
        <div className="account">
          {!!home && <><span className="role"><LockKeyhole size={14} /> {student ? "Student" : "Parent"}</span><form method="POST" action="/api/access/sign-out"><button type="submit" aria-label="Sign out" title="Sign out" className="icon-button"><LogOut size={18} /></button></form></>}
        </div>
      </div>
    </header>
    <main ref={main} tabIndex={-1} className="shell main-shell">
      {pane === "home" && <>
        <section className="hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <p className="overline hero-overline"><Ball size={16} /> Toronto Raptors practice</p>
            <h1 id="home-title">SPANISH<br /><em>COURTSIDE.</em></h1>
            <p className="hero-description">Practice this week’s Spanish with short basketball drills.</p>
            {student ? <button className="button primary" disabled={busy} onClick={() => openRun(home?.study?.resume?.id ?? topic.id, Boolean(home?.study?.resume))}>
                {busy ? "Opening practice…" : home?.study?.resume ? "Resume practice" : "Start practice"}
              </button>
              : home ? <button className="button primary" onClick={() => navigate("add")}><ListPlus size={19} /> Add a topic</button>
              : <p role="status" className="loading">{error ? "Cancha could not load." : "Loading your tutor…"}</p>}
          </div>
        </section>
        <ErrorNote message={error} />
        <div className="home-grid">
          <section className="panel current-topic">
            <div className="panel-icon"><BookOpen size={21} /></div>
            <div className="current-copy">
              <p className="overline">Current class topic</p>
              <h2>{topic.title}</h2>
              <p>{topic.notes}</p>
              <button type="button" className="text-button" onClick={() => preview(topic)}>Preview topic</button>
            </div>
          </section>
          <section className="panel training-card">
            <CourtMark />
            <div className="panel-icon"><RotateCcw size={21} /></div>
            <div className="current-copy">
              <p className="overline">{student ? "Your review" : "The practice format"}</p>
              <h2>{student ? (home.study?.review ? `${home.study.review} to revisit` : "Ready for a new drill") : "Recall, retry, review"}</h2>
              <p>{student ? (home.study?.review ? "Your next drill starts with forms you’ve been working on." : "Forms you need another try at will show up in a later drill.")
                : "One verb at a time, with a hint when he gets stuck and a fresh question later."}</p>
              <span className="meta"><Clock3 size={16} /> Short sessions</span>
            </div>
          </section>
        </div>
        {home && <section className="panel news-teaser" lang="es">
          <span className="panel-icon"><Newspaper size={22} /></span>
          <div><h2>NBA en español</h2><p>Lee titulares y rumores de la liga. Sigue de cerca a los Toronto Raptors.</p></div>
          <button type="button" className="button secondary" onClick={() => navigate("nba")}>Ver titulares</button>
        </section>}
        {home?.role === "coach" && <StudentInvitation joined={Boolean(home.studentJoined)} />}
      </>}
      {pane === "topics" && <>
        <Heading onBack={returnHome} label="Home">Class topics</Heading>
        <div className="subhead"><p>Topics added by either account show up here.</p><button className="button primary" onClick={() => navigate("add")}><ListPlus size={18} /> Add a topic</button></div>
        <div className="topic-list">
          {topics.map((value, index) => <button type="button" key={value.id} className="panel topic-row" onClick={() => preview(value)}>
            <span className="panel-icon"><BookOpen size={19} /></span>
            <span className="topic-row-copy"><strong>{value.title}</strong><span>{value.notes}</span></span>
            {index === 0 && <span className="tag">Current</span>}
          </button>)}
        </div>
      </>}
      {pane === "add" && <TopicForm onAdded={added} onBack={() => navigate("topics")} />}
      {pane === "preview" && selected && <>
        <Heading onBack={() => navigate(home ? "topics" : "home")} label={home ? "Class topics" : "Home"}>{selected.title}</Heading>
        <div className="panel preview">
          <p className="source-note">{selected.notes}</p>
          <div className="tags">
            {selected.focuses.map(focus => <span key={focus} className="tag">{focusLabels[focus]}</span>)}
            {selected.custom.length > 0 && <span className="tag">Custom prompts</span>}
          </div>
          <h2>Sample prompts</h2>
          <Samples topic={selected} />
          {student && <button className="button primary" disabled={busy} onClick={() => openRun(selected.id)}>{busy ? "Opening practice…" : "Start this drill"}</button>}
          <ErrorNote message={error} />
        </div>
      </>}
      {pane === "nba" && <NbaNews onBack={returnHome} />}
      {pane === "practice" && run && <Practice key={run.id} run={run} onChange={setRun} onExit={returnHome} />}
      <footer className="site-footer"><span><Ball size={16} /> Cancha</span><span>{student ? "Your practice is private to this account." : "Grade 11 Spanish practice"}</span></footer>
    </main>
  </>;
}

function Samples({ topic }: { topic: Pick<Topic, "focuses" | "verbs" | "custom"> }) {
  const bank = exercisesFor(topic);
  const seen = new Set<string>();
  const unique = bank.filter(exercise => !seen.has(exercise.skill) && seen.add(exercise.skill));
  const byFocus = topic.focuses.flatMap(focus => unique.find(exercise => exercise.id.startsWith(focus + ":")) ?? []);
  const sample = [...new Set([...byFocus, ...unique])].slice(0, 4);
  return sample.length > 0 && <ul className="samples">
    {sample.map(value => <li key={value.id}><span>{value.scene}</span><strong lang="es">{value.sentence}</strong><span className="cue">Verb <b lang="es">{value.cue}</b></span></li>)}
  </ul>;
}

function TopicForm({ onAdded, onBack }: { onAdded: (topic: Topic) => void; onBack: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [verbs, setVerbs] = useState<string[]>([]);
  const [custom, setCustom] = useState<Custom[]>([]);
  const [stage, setStage] = useState<"input" | "review">("input");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const previewTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => { if (stage === "review") previewTitle.current?.focus(); }, [stage]);
  const bank = exercisesFor({ focuses, verbs, custom: [] });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (stage === "input") {
      const suggested = suggestTopic(title + " " + notes);
      setFocuses(suggested.focuses);
      setVerbs(suggested.verbs);
      setStage("review");
      window.scrollTo(0, 0);
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ topic: Topic }>("", { action: "add", title, notes, focuses, verbs, custom });
      onAdded(result.topic);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateExercise(index: number, field: keyof Custom, value: string) {
    setCustom(items => items.map((item, row) => row === index ? { ...item, [field]: value } : item));
  }

  return <>
    <Heading onBack={onBack} label="Class topics">Add a topic</Heading>
    <form className="panel topic-form" onSubmit={submit}>
      {stage === "input" ? <>
        <p>Paste the relevant lines from class or describe what he needs to practice.</p>
        <label>Topic name<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Affirmative commands" /></label>
        <label>What’s on the lesson?<textarea required rows={5} maxLength={2400} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Tú and vosotros commands, including hacer and decir." /></label>
        <button className="button primary" type="submit">Preview practice</button>
      </> : <>
        <h2 tabIndex={-1} ref={previewTitle}>{title}</h2>
        <p className="source-note">{notes}</p>
        <button className="text-button" type="button" onClick={() => { setStage("input"); setError(""); }}>Edit topic details</button>
        <fieldset>
          <legend>What should the tutor cover?</legend>
          {!focuses.length && <p className="muted">Choose a focus below or add a custom prompt for this topic.</p>}
          <div className="focus-options">{Object.entries(focusLabels).map(([id, label]) => {
            const key = id as Focus;
            return <label className={focuses.includes(key) ? "choice chosen" : "choice"} key={key}>
              <input type="checkbox" checked={focuses.includes(key)} onChange={(event) => setFocuses(current => event.target.checked ? [...current, key] : current.filter(value => value !== key))} />
              {label}
            </label>;
          })}</div>
        </fieldset>
        {!!verbs.length && <div><p className="muted">Verbs found in the topic. Select a verb to remove the preference.</p><div className="tags">
          {verbs.map(verb => <button type="button" className="tag removable" key={verb} onClick={() => setVerbs(current => current.filter(value => value !== verb))} aria-label={`Remove ${verb} from preferred verbs`}>{verb} ×</button>)}
        </div></div>}
        {!!bank.length && <div><h3>Sample prompts</h3><Samples topic={{ focuses, verbs, custom: [] }} /></div>}
        {custom.map((value, index) => <fieldset key={index} className="custom-fields">
          <legend>Custom prompt {index + 1}</legend>
          <div className="field-grid">
            <label>Situation in English<input required maxLength={180} value={value.scene} onChange={event => updateExercise(index, "scene", event.target.value)} placeholder="Tell the team to pass the ball." /></label>
            <label>Spanish sentence with ___<input required maxLength={180} value={value.sentence} onChange={event => updateExercise(index, "sentence", event.target.value)} placeholder="___ el balón." /></label>
            <label>Verb or cue<input required maxLength={40} value={value.cue} onChange={event => updateExercise(index, "cue", event.target.value)} placeholder="pasar" /></label>
            <label>Missing word or phrase<input required maxLength={60} value={value.answer} onChange={event => updateExercise(index, "answer", event.target.value)} placeholder="pasad" /></label>
          </div>
          <label>Hint<input required maxLength={240} value={value.hint} onChange={event => updateExercise(index, "hint", event.target.value)} placeholder="Change the last -r to -d for vosotros." /></label>
          <div className="field-grid">
            <label>Alternate review situation<input maxLength={180} required={!!value.alternateSentence} value={value.alternateScene} onChange={event => updateExercise(index, "alternateScene", event.target.value)} placeholder="Optional" /></label>
            <label>Alternate Spanish sentence with ___<input maxLength={180} required={!!value.alternateScene} value={value.alternateSentence} onChange={event => updateExercise(index, "alternateSentence", event.target.value)} placeholder="Optional, same missing form" /></label>
          </div>
          <button type="button" className="text-button" onClick={() => setCustom(items => items.filter((_, row) => row !== index))}>Remove prompt</button>
        </fieldset>)}
        <div className="button-row">
          <button type="submit" className="button primary" disabled={busy || !(bank.length || custom.length)}>{busy ? "Saving…" : "Save class topic"} <Check size={19} /></button>
          {custom.length < 8 && <button type="button" className="button secondary" onClick={() => setCustom(items => [...items, { ...emptyExercise }])}>Add a custom prompt</button>}
        </div>
      </>}
      <ErrorNote message={error} />
    </form>
  </>;
}

function Practice({ run, onChange, onExit }: { run: RunView; onChange: (run: RunView) => void; onExit: () => void }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const answerInput = useRef<HTMLInputElement>(null);
  const advance = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const { exercise, feedback } = run;

  useEffect(() => {
    if (run.results) summary.current?.focus();
    else if (feedback?.phase === "done") advance.current?.focus();
    else answerInput.current?.focus();
  }, [run.position, feedback?.phase, run.results, busy]);

  async function respond(stuck: boolean) {
    if (busy || (!stuck && !answer.trim())) return;
    setError("");
    setBusy(true);
    try {
      onChange(await api<RunView>("", { action: "answer", session: run.id, position: run.position, revision: run.revision, answer, stuck }));
      setAnswer("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    setBusy(true);
    setError("");
    try {
      onChange(await api<RunView>(`?session=${encodeURIComponent(run.id)}&position=${run.position + 1}`));
      setAnswer("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (run.results) return <section className="panel results">
    <div className="panel-icon"><Check size={26} /></div>
    <h1 tabIndex={-1} ref={summary}>Drill complete</h1>
    <p>{run.title}</p>
    <div className="result-stats">
      <div><strong>{run.results.independent}/{run.total}</strong><span>On the first try</span></div>
      <div><strong>{run.results.review}</strong><span>To practice again</span></div>
    </div>
    <button type="button" className="button primary" onClick={onExit}>Back to practice</button>
  </section>;
  if (!exercise) return null;

  return <>
    <div className="section-heading practice-head">
      <button className="text-button back" type="button" onClick={onExit}>Back to practice</button>
      <span className="overline">{run.title}</span>
    </div>
    <section className="panel practice" aria-labelledby="question">
      <div className="practice-progress">
        <div><span className="overline">{exercise.review ? "Review warm-up" : "Raptors drill"}</span><span className="count">Prompt {run.position + 1} of {run.total}</span></div>
        <progress value={run.position + Number(feedback?.phase === "done")} max={run.total} aria-label="Completed prompts" />
      </div>
      <h1 id="question">{exercise.scene}</h1>
      <p className="sentence" lang="es">{exercise.sentence}</p>
      <p className="cue">Verb <b lang="es">{exercise.cue}</b></p>
      {feedback?.phase === "done" ? <>
        <div className={feedback.outcome === "revealed" ? "notice feedback" : "notice success"} role="status">
          {feedback.outcome === "revealed" ? <Lightbulb size={21} /> : <Check size={21} />}
          <div><strong>{feedback.outcome === "independent" ? "Correct on the first try" : feedback.outcome === "assisted" ? "You got it with the hint" : "Here’s the form"}</strong>
          <p lang="es">{exercise.sentence.replace("___", feedback.answer ?? "")}</p>
          {feedback.outcome !== "independent" && <p>{feedback.hint}</p>}</div>
        </div>
        <button type="button" ref={advance} className="button primary" onClick={next} disabled={busy}>{run.position + 1 === run.total ? "See results" : "Next prompt"}</button>
      </> : <form onSubmit={event => { event.preventDefault(); void respond(false); }}>
        {feedback?.phase === "hint" && <div className="notice feedback" role="status"><Lightbulb size={21} /><div><strong>Try this hint</strong><p>{feedback.hint}</p></div></div>}
        <label className="answer-label">Missing form
          <input ref={answerInput} lang="es" type="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Type the verb form" maxLength={90} value={answer} onChange={event => setAnswer(event.target.value)} disabled={busy} required />
        </label>
        <div className="accents" aria-label="Spanish characters">{["á", "é", "í", "ó", "ú", "ü", "ñ"].map(letter => <button type="button" key={letter} disabled={busy} onClick={() => {
          const input = answerInput.current;
          const start = input?.selectionStart ?? answer.length;
          const end = input?.selectionEnd ?? start;
          if (answer.length - (end - start) >= 90) return;
          setAnswer(answer.slice(0, start) + letter + answer.slice(end));
          requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + 1, start + 1); });
        }} aria-label={`Insert ${letter}`}>{letter}</button>)}</div>
        <div className="button-row">
          <button type="submit" className="button primary" disabled={busy || !answer.trim()}>{busy ? "Checking…" : feedback ? "Check retry" : "Check answer"} <Check size={19} /></button>
          <button type="button" className="button secondary" disabled={busy} onClick={() => respond(true)}><Lightbulb size={18} /> {feedback ? "Show the answer" : "I’m stuck"}</button>
        </div>
      </form>}
      <ErrorNote message={error} />
    </section>
  </>;
}
