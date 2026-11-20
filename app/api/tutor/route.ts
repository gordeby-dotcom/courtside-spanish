import { env } from "cloudflare:workers";
import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  exercisesFor, focusLabels, isCorrect, planPractice, publicExercise, starterTopic,
  type Exercise, type HomeView, type ResponseState, type RunView, type Topic, type TopicContent,
} from "@/lib/lesson";

export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  topic_title: string;
  exercises: string;
}

interface ResponseRow {
  position: number;
  exercise: string;
  state: string;
  revision: number;
}

interface TopicRow {
  id: string;
  title: string;
  notes: string;
  content: string;
}

const focusIds = Object.keys(focusLabels) as [keyof typeof focusLabels, ...(keyof typeof focusLabels)[]];
const text = (length: number) => z.string().trim().min(1).max(length);
const customSchema = z.object({
  scene: text(180),
  sentence: text(180).refine(value => value.split("___").length === 2, "Use one blank (___) in the Spanish sentence."),
  cue: text(40),
  answer: text(60),
  hint: text(240),
  alternateScene: z.string().trim().max(180),
  alternateSentence: z.string().trim().max(180).refine(value => !value || value.split("___").length === 2, "Use one blank (___) in the alternate sentence."),
}).refine(value => Boolean(value.alternateScene) === Boolean(value.alternateSentence), "Add both parts of the alternate prompt.");

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    title: text(100),
    notes: text(2400),
    focuses: z.array(z.enum(focusIds)).max(focusIds.length),
    verbs: z.array(text(30)).max(45),
    custom: z.array(customSchema).max(8),
  }),
  z.object({ action: z.literal("start"), topic: text(80) }),
  z.object({
    action: z.literal("answer"),
    session: z.string().uuid(),
    position: z.number().int().min(0).max(7),
    revision: z.number().int().min(0).max(1),
    answer: z.string().trim().max(90),
    stuck: z.boolean(),
  }),
]);

function reply(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, oai-authenticated-user-id" },
  });
}

async function actor() {
  const coach = env.COACH_EMAIL?.trim().toLowerCase();
  if (!coach || !env.DB) return { error: reply({ error: "Cancha is still being set up." }, 503) };
  const user = await getChatGPTUser();
  if (!user) return { error: reply({ error: "Sign in to continue." }, 401) };
  return { id: user.userId, role: user.email.toLowerCase().trim() === coach ? "coach" as const : "student" as const, db: env.DB };
}

async function loadTopics(db: D1Database): Promise<Topic[]> {
  const rows = await db.prepare("SELECT id, title, notes, content FROM topics ORDER BY created_at DESC, rowid DESC LIMIT 100").all<TopicRow>();
  return [...rows.results.map(({ content, ...topic }) => ({ ...topic, ...JSON.parse(content) as TopicContent })), starterTopic];
}

async function loadSession(db: D1Database, owner: string, id: string) {
  const session = await db.prepare("SELECT id, topic_title, exercises FROM sessions WHERE owner = ? AND id = ?")
    .bind(owner, id).first<SessionRow>();
  if (!session) return null;
  const results = await db.prepare("SELECT position, exercise, state, revision FROM responses WHERE owner = ? AND session_id = ? ORDER BY position")
    .bind(owner, id).all<ResponseRow>();
  return { session, exercises: JSON.parse(session.exercises) as Exercise[], rows: results.results };
}

type Session = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

function renderRun({ session, exercises, rows }: Session, requested?: number): RunView {
  const states = rows.map(row => JSON.parse(row.state) as ResponseState);
  const completed = states.filter(state => state.phase === "done").length;
  const position = Number.isInteger(requested) && requested! >= 0 && requested! <= completed ? requested! : completed;
  const exercise = exercises[position];
  const view = { id: session.id, title: session.topic_title, total: exercises.length, position, revision: 0 };
  if (!exercise) {
    const independent = states.filter(state => state.phase === "done" && state.outcome === "independent").length;
    return { ...view, results: { independent, review: completed - independent } };
  }
  const row = rows.find(value => value.position === position);
  const state: ResponseState | undefined = row ? JSON.parse(row.state) : undefined;
  return {
    ...view, exercise: publicExercise(exercise), revision: row?.revision ?? 0,
    feedback: state?.phase === "hint" ? { phase: "hint", hint: exercise.hint }
      : state?.phase === "done" ? { phase: "done", outcome: state.outcome, answer: exercise.answer, hint: exercise.hint } : undefined,
  };
}

async function reviewState(db: D1Database, owner: string) {
  const result = await db.prepare(`
    WITH latest AS (
      SELECT exercise, state, updated_at, rowid AS sequence,
        row_number() OVER (PARTITION BY skill ORDER BY updated_at DESC, rowid DESC) AS rank
      FROM responses WHERE owner = ?
    )
    SELECT exercise, state FROM latest WHERE rank = 1 ORDER BY updated_at ASC, sequence ASC
  `).bind(owner).all<Pick<ResponseRow, "exercise" | "state">>();
  const previous = new Map<string, Exercise>();
  const due: Exercise[] = [];
  for (const row of result.results) {
    const exercise = JSON.parse(row.exercise) as Exercise;
    const state = JSON.parse(row.state) as ResponseState;
    previous.set(exercise.skill, exercise);
    if (state.phase !== "done" || state.outcome !== "independent") due.push(exercise);
  }
  return { previous, due };
}

function studentOnly() {
  return reply({ error: "Practice is available in the student account." }, 403);
}

export async function GET(request: Request) {
  const auth = await actor();
  if (auth.error) return auth.error;
  const search = new URL(request.url).searchParams;
  const id = search.get("session");
  if (id) {
    if (auth.role !== "student") return studentOnly();
    const session = await loadSession(auth.db, auth.id, id);
    const position = search.get("position");
    return session ? reply(renderRun(session, position === null ? undefined : Number(position))) : reply({ error: "Practice session not found." }, 404);
  }
  const { db, id: owner, role } = auth;
  if (role === "coach") return reply({ role, topics: await loadTopics(db) } satisfies HomeView);

  const [topics, reviews, rounds, recent] = await Promise.all([
    loadTopics(db),
    reviewState(db, owner),
    db.prepare(`SELECT count(*) AS total FROM sessions s WHERE s.owner = ?
      AND (SELECT count(*) FROM responses r WHERE r.session_id = s.id AND r.owner = s.owner
        AND json_extract(r.state, '$.phase') = 'done') = json_array_length(s.exercises)`)
      .bind(owner).first<{ total: number }>(),
    db.prepare(`SELECT s.id, s.topic_title, json_array_length(s.exercises) AS size,
      (SELECT count(*) FROM responses r WHERE r.session_id = s.id AND r.owner = s.owner
         AND json_extract(r.state, '$.phase') = 'done') AS done
      FROM sessions s WHERE s.owner = ? ORDER BY s.created_at DESC, s.rowid DESC LIMIT 1`)
      .bind(owner).first<{ id: string; topic_title: string; size: number; done: number }>(),
  ]);
  const resume = recent && recent.done < recent.size ? { id: recent.id, title: recent.topic_title } : null;
  return reply({ role, topics, study: { review: reviews.due.length, rounds: rounds?.total ?? 0, resume } } satisfies HomeView);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return reply({ error: "This request must come from Cancha." }, 403);
  const auth = await actor();
  if (auth.error) return auth.error;
  if (Number(request.headers.get("content-length")) > 25000) return reply({ error: "This topic is too large." }, 413);
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 25000) return reply({ error: "This topic is too large." }, 413);
    input = JSON.parse(body);
  } catch {
    return reply({ error: "Could not read that request." }, 400);
  }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return reply({ error: parsed.error.issues[0]?.message ?? "Check the details and try again." }, 400);
  const data = parsed.data;
  const { db, id: owner, role } = auth;
  if (data.action === "answer" && !data.stuck && !data.answer) return reply({ error: "Enter an answer first." }, 400);

  if (data.action === "add") {
    const id = crypto.randomUUID();
    const custom = data.custom.flatMap((exercise, index) => {
      const skill = `custom:${id}:${index}`;
      const { alternateSentence, alternateScene, ...main } = exercise;
      const first = { ...main, skill, id: `${skill}:0`, label: main.cue };
      return alternateSentence
        ? [first, { ...first, id: `${skill}:1`, scene: alternateScene, sentence: alternateSentence }]
        : [first];
    });
    const content: TopicContent = { focuses: [...new Set(data.focuses)], verbs: [...new Set(data.verbs)], custom };
    if (!exercisesFor(content).length) return reply({ error: "Choose a practice focus or add an exercise." }, 400);
    await db.prepare("INSERT INTO topics (id, title, notes, content, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, data.title, data.notes, JSON.stringify(content), Date.now()).run();
    return reply({ topic: { id, title: data.title, notes: data.notes, ...content } }, 201);
  }

  if (role !== "student") return studentOnly();
  if (data.action === "start") {
    const [topics, history] = await Promise.all([loadTopics(db), reviewState(db, owner)]);
    const topic = topics.find(value => value.id === data.topic);
    if (!topic) return reply({ error: "Class topic not found." }, 404);
    const id = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const exercises = planPractice(topic, history.due, history.previous, seed, topics.flatMap(value => value.custom));
    if (!exercises.length) return reply({ error: "Add an exercise to this topic first." }, 400);
    const session: SessionRow = { id, topic_title: topic.title, exercises: JSON.stringify(exercises) };
    await db.prepare("INSERT INTO sessions (id, owner, topic_title, exercises, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, owner, topic.title, session.exercises, Date.now()).run();
    return reply(renderRun({ session, exercises, rows: [] }), 201);
  }

  const session = await loadSession(db, owner, data.session);
  if (!session) return reply({ error: "Practice session not found." }, 404);
  const view = renderRun(session, data.position);
  const exercise = session.exercises[data.position];
  if (view.position !== data.position || !exercise) return reply(view);
  if (view.feedback?.phase === "done" || view.revision !== data.revision) return reply(view);
  const assisted = view.feedback?.phase === "hint";
  const correct = !data.stuck && isCorrect(data.answer, exercise.answer);
  const state: ResponseState = correct
    ? { phase: "done", outcome: assisted ? "assisted" : "independent" }
    : assisted ? { phase: "done", outcome: "revealed" } : { phase: "hint" };
  const updatedAt = Date.now();
  if (data.revision) {
    await db.prepare("UPDATE responses SET state = ?, revision = 2, updated_at = ? WHERE owner = ? AND session_id = ? AND position = ? AND revision = 1")
      .bind(JSON.stringify(state), updatedAt, owner, data.session, data.position).run();
  } else {
    await db.prepare("INSERT OR IGNORE INTO responses (session_id, position, owner, skill, exercise, state, revision, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
      .bind(data.session, data.position, owner, exercise.skill, JSON.stringify(exercise), JSON.stringify(state), updatedAt).run();
  }
  const current = await loadSession(db, owner, data.session);
  return current ? reply(renderRun(current, data.position)) : reply({ error: "Practice session not found." }, 404);
}
