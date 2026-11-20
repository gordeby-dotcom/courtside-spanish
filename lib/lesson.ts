export const focusLabels = {
  "commands-tu": "Affirmative commands · tú",
  "commands-vos": "Affirmative commands · vosotros",
  "negative-tu": "Negative commands · tú",
  "negative-vos": "Negative commands · vosotros",
  "present-regular": "Regular present tense",
  "present-irregular": "Irregular present tense",
  "preterite": "Preterite",
  "imperfect": "Imperfect",
  "past-choice": "Preterite vs. imperfect",
  "ser-estar": "Ser vs. estar",
} as const;

export type Focus = keyof typeof focusLabels;

export type Exercise = {
  id: string;
  skill: string;
  label: string;
  scene: string;
  sentence: string;
  cue: string;
  answer: string;
  hint: string;
  review?: boolean;
};

export type TopicContent = { focuses: Focus[]; verbs: string[]; custom: Exercise[] };
export type Topic = TopicContent & { id: string; title: string; notes: string };
export type Outcome = "independent" | "assisted" | "revealed";
export type ResponseState = { phase: "hint" } | { phase: "done"; outcome: Outcome };
export type PublicExercise = Omit<Exercise, "answer" | "hint" | "skill">;
export type RunView = {
  id: string;
  title: string;
  total: number;
  position: number;
  exercise?: PublicExercise;
  revision: number;
  feedback?: { phase: "hint" | "done"; hint?: string; answer?: string; outcome?: Outcome };
  results?: { independent: number; review: number };
};
export type HomeView = {
  role: "coach" | "student";
  topics: Topic[];
  study?: { review: number; rounds: number; resume: { id: string; title: string } | null };
};

export const starterTopic: Topic = {
  id: "raptors-starter",
  title: "Affirmative commands",
  notes: "Give directions to one player (tú) or to the team (vosotros). Includes the irregular tú form of hacer.",
  focuses: ["commands-tu", "commands-vos"],
  verbs: ["pasar", "hacer", "abrir", "mover"],
  custom: [],
};

type Move = { verb: string; contexts: Array<[string, string]>; tu?: string; negative?: [string, string] };
const moves: Move[] = [
  { verb: "pasar", contexts: [["pass the ball", "el balón"], ["pass the ball to the wing", "el balón al alero"], ["pass again", "otra vez"]] },
  { verb: "hacer", tu: "haz", contexts: [["fake", "una finta"], ["set a screen", "un bloqueo"], ["make one more pass", "otro pase"]] },
  { verb: "abrir", contexts: [["open the gym door", "la puerta del gimnasio"], ["open the playbook", "el manual de jugadas"], ["open the equipment bag", "la bolsa de material"]] },
  { verb: "mover", tu: "mueve", negative: ["muevas", "mováis"], contexts: [["move the ball", "el balón"], ["move the bench", "el banco"], ["move the cones", "los conos"]] },
  { verb: "mirar", contexts: [["watch the ball", "el balón"], ["look at the scoreboard", "el marcador"], ["look at the coach", "al entrenador"]] },
  { verb: "correr", contexts: [["run to the bench", "al banco"], ["run to the basket", "hacia la canasta"], ["run faster", "más rápido"]] },
  { verb: "decir", tu: "di", negative: ["digas", "digáis"], contexts: [["say the result", "el resultado"], ["say the name of the play", "el nombre de la jugada"], ["say the score out loud", "el marcador en voz alta"]] },
  { verb: "poner", tu: "pon", negative: ["pongas", "pongáis"], contexts: [["put the ball on the rack", "el balón en el estante"], ["put the cones here", "los conos aquí"], ["put the bag by the bench", "la bolsa junto al banco"]] },
  { verb: "salir", tu: "sal", negative: ["salgas", "salgáis"], contexts: [["leave the locker room", "del vestuario"], ["leave the court", "de la cancha"], ["go out now", "ahora"]] },
  { verb: "venir", tu: "ven", negative: ["vengas", "vengáis"], contexts: [["come to the bench", "al banco"], ["come to practice", "al entrenamiento"], ["come here", "aquí"]] },
  { verb: "tener", tu: "ten", negative: ["tengas", "tengáis"], contexts: [["be patient", "paciencia"], ["be careful", "cuidado"], ["have the ball ready", "el balón preparado"]] },
  { verb: "ir", tu: "ve", negative: ["vayas", "vayáis"], contexts: [["go to practice", "al entrenamiento"], ["go to the bench", "al banco"], ["go to the locker room", "al vestuario"]] },
  { verb: "ser", tu: "sé", negative: ["seas", "seáis"], contexts: [["be an example", "un ejemplo"], ["be a good teammate", "buen compañero"], ["be careful", "prudente"]] },
];

function commandExercises(focus: Focus): Exercise[] {
  const plural = focus.endsWith("-vos");
  const negative = focus.startsWith("negative");
  const person = plural ? "vosotros" : "tú";
  return moves.flatMap(move => {
    const stem = move.verb.slice(0, -2);
    const ar = move.verb.endsWith("ar");
    let answer = plural ? move.verb.slice(0, -1) + "d" : (move.tu ?? stem + (ar ? "a" : "e"));
    let hint = plural
      ? "For an affirmative vosotros command, change the infinitive’s final -r to -d."
      : move.tu
        ? (move.verb === "mover" ? "The o in mover changes to ue. Use the same form as él or ella in the present." : "This verb has an irregular affirmative tú command. Think of its short command form.")
        : `For this affirmative tú command, use the stem and add -${ar ? "a" : "e"}, like the él or ella present form.`;
    if (negative) {
      const forms = move.negative ?? (move.verb === "hacer" ? ["hagas", "hagáis"] : null);
      const ending = plural ? (ar ? "éis" : "áis") : (ar ? "es" : "as");
      answer = forms?.[plural ? 1 : 0] ?? stem + ending;
      hint = forms
        ? "A negative command takes the present subjunctive. Think of this verb’s irregular stem and match the person."
        : `After no, use the present subjunctive. For this verb and person, add -${ending} to the stem.`;
    }
    return move.contexts.map(([action, phrase], index) => ({
      id: `${focus}:${move.verb}:${index}`,
      skill: `${focus}:${move.verb}`,
      label: `${move.verb} · ${person}${negative ? " (negative)" : ""}`,
      scene: `Tell ${plural ? "the team" : "one player"} ${negative ? "not to" : "to"} ${action}.`,
      sentence: `${negative ? "No " : ""}___ ${phrase}.`,
      cue: move.verb,
      answer,
      hint,
    }));
  });
}

type VerbDrill = {
  focus: Focus;
  verb: string;
  person: string;
  answer: string;
  hint: string;
  contexts: Array<[string, string]>;
};

const drills: VerbDrill[] = [
  {focus:"present-regular", verb:"practicar", person:"nosotros", answer:"practicamos", hint:"In the present tense, nosotros takes -amos with an -ar verb.", contexts:[["Describe the team’s regular routine.", "Nosotros ___ todos los lunes."], ["Describe a regular warm-up.", "Nosotros ___ los tiros libres antes del partido."]]},
  {focus:"present-regular", verb:"correr", person:"tú", answer:"corres", hint:"For tú in the present tense, replace -er with -es.", contexts:[["Tell a teammate what they do in practice.", "Tú ___ todos los días."], ["Describe how a teammate runs.", "Tú ___ muy rápido."]]},
  {focus:"present-regular", verb:"aprender", person:"ellos", answer:"aprenden", hint:"For ellos in the present, an -er verb ends in -en.", contexts:[["Talk about the rookies.", "Ellos ___ una jugada nueva cada semana."], ["Describe this week’s team practice.", "Ellos ___ mucho en el entrenamiento."]]},
  {focus:"present-regular", verb:"recibir", person:"yo", answer:"recibo", hint:"In the present, a regular yo form ends in -o.", contexts:[["Say what you receive from the coach.", "Yo ___ instrucciones del entrenador."], ["Describe your job in the play.", "Yo ___ el balón en la esquina."]]},
  {focus:"present-irregular", verb:"hacer", person:"yo", answer:"hago", hint:"Hacer is irregular in the yo form. It has a -g- before the final -o.", contexts:[["Describe your move in practice.", "Yo ___ una finta."], ["Describe your warm-up.", "Yo ___ unos ejercicios antes del partido."]]},
  {focus:"present-irregular", verb:"tener", person:"tú", answer:"tienes", hint:"The e in the stem changes to ie in this form. Use the tú ending -es.", contexts:[["Describe the teammate with the ball.", "Tú ___ el balón."], ["Describe a teammate’s opportunity.", "Tú ___ una buena oportunidad."]]},
  {focus:"present-irregular", verb:"poder", person:"él", answer:"puede", hint:"In él, the stem o changes to ue. Use the present ending -e.", contexts:[["Say what the point guard can do.", "Él ___ pasar el balón."], ["Comment on a teammate’s ability.", "Él ___ tirar desde lejos."]]},
  {focus:"present-irregular", verb:"ir", person:"nosotros", answer:"vamos", hint:"Ir uses the v- stem in this present form. Think of the phrase ‘let’s go.’", contexts:[["Talk about where the team goes.", "Nosotros ___ al gimnasio."], ["Tell someone where the team goes on Fridays.", "Nosotros ___ a la cancha los viernes."]]},
  {focus:"preterite", verb:"ganar", person:"nosotros", answer:"ganamos", hint:"The nosotros preterite ending for an -ar verb is -amos.", contexts:[["Describe a finished game.", "Ayer nosotros ___ el partido."], ["Report last week’s result.", "La semana pasada nosotros ___ por un punto."]]},
  {focus:"preterite", verb:"hacer", person:"él", answer:"hizo", hint:"Hacer has an irregular preterite. In él, the stem is hiz- and the ending is -o.", contexts:[["Describe a single play from last night.", "Anoche él ___ una finta."], ["Report an action at the buzzer.", "Al final él ___ un pase."]]},
  {focus:"preterite", verb:"meter", person:"yo", answer:"metí", hint:"An -er verb uses -í in the yo preterite. Keep the accent.", contexts:[["Report a basket you made yesterday.", "Ayer yo ___ una canasta."], ["Describe a shot from the last game.", "En el último partido, yo ___ un triple."]]},
  {focus:"preterite", verb:"pasar", person:"tú", answer:"pasaste", hint:"The tú preterite ending for an -ar verb is -aste.", contexts:[["Describe one completed pass.", "Tú ___ el balón en el último segundo."], ["Describe an action yesterday.", "Ayer tú ___ el balón al pívot."]]},
  {focus:"imperfect", verb:"jugar", person:"nosotros", answer:"jugábamos", hint:"For nosotros with an -ar verb, use the imperfect ending -ábamos.", contexts:[["Describe an old routine.", "Nosotros ___ todos los sábados."], ["Describe where you used to play.", "De pequeños, nosotros ___ en el parque."]]},
  {focus:"imperfect", verb:"tener", person:"él", answer:"tenía", hint:"For a third-person singular -er verb, use -ía in the imperfect.", contexts:[["Describe a teammate’s age back then.", "Él ___ diez años cuando empezó."], ["Describe how the ball was already in his hands.", "Cuando sonó el silbato, él ya ___ el balón."]]},
  {focus:"imperfect", verb:"ir", person:"yo", answer:"iba", hint:"Ir is irregular in the imperfect. The first-person ending is -a.", contexts:[["Describe a regular trip to the gym.", "Antes yo ___ al gimnasio los viernes."], ["Describe your routine as a kid.", "De niño yo ___ a todos los partidos."]]},
  {focus:"past-choice", verb:"entrenar", person:"nosotros", answer:"entrenábamos", hint:"A routine in the past takes the imperfect. Add -ábamos for nosotros.", contexts:[["Describe what the team used to do every morning.", "Antes nosotros ___ todas las mañanas."], ["Describe an ongoing activity when something happened.", "Nosotros ___ cuando llegó el entrenador."]]},
  {focus:"past-choice", verb:"llegar", person:"él", answer:"llegó", hint:"A completed arrival in this scene takes the preterite. Use -ó for él.", contexts:[["Describe a single completed arrival.", "Ayer el entrenador ___ a las ocho."], ["Describe the arrival that interrupted warmups.", "Mientras calentábamos, el entrenador ___."]]},
  {focus:"past-choice", verb:"llover", person:"clima", answer:"llovía", hint:"Background weather in a past scene usually takes the imperfect. Use -ía.", contexts:[["Describe the weather in the background.", "Cuando empezó el partido, ___."], ["Set the scene before a player arrived.", "___ cuando llegó al gimnasio."]]},
  {focus:"ser-estar", verb:"ser", person:"él", answer:"es", hint:"Use ser to identify a person or describe their role. The form for él is irregular.", contexts:[["Identify the Raptors’ coach in your scenario.", "Él ___ el entrenador."], ["Identify a player by their position.", "Él ___ el base."]]},
  {focus:"ser-estar", verb:"estar", person:"él", answer:"está", hint:"Use estar to say where a person or object is. The final a takes an accent.", contexts:[["Say where the basketball is.", "El balón ___ en la cancha."], ["Describe where the coach is right now.", "El entrenador ___ en el vestuario."]]},
  {focus:"ser-estar", verb:"estar", person:"ellos", answer:"están", hint:"Use estar for how someone feels right now. The ellos form ends in -án.", contexts:[["Describe how the players feel now.", "Los jugadores ___ cansados."], ["Describe the team after the result.", "Ellos ___ contentos después del partido."]]},
];

function focusExercises(focus: Focus): Exercise[] {
  if (focus.startsWith("commands") || focus.startsWith("negative")) return commandExercises(focus);
  return drills.filter(drill => drill.focus === focus).flatMap(drill => drill.contexts.map(([scene, sentence], index) => {
    const skill = `${focus}:${drill.verb}:${drill.person}`;
    return { id: `${skill}:${index}`, skill, label: `${drill.verb} · ${drill.person}`, scene, sentence, cue: focus === "ser-estar" ? "ser / estar" : drill.verb, answer: drill.answer, hint: drill.hint };
  }));
}

const allExercises = Object.keys(focusLabels).flatMap(key => focusExercises(key as Focus));
const verbs = [...new Set([...moves.map(move => move.verb), ...drills.map(drill => drill.verb)])];

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function suggestTopic(notes: string): { focuses: Focus[]; verbs: string[] } {
  const plain = fold(notes);
  const words = new Set(plain.match(/[a-z]+/g) ?? []);
  const selectedVerbs = verbs.filter(verb => words.has(verb));
  if (/imperativ|commands?|mandatos?/.test(plain)) {
    const negative = /\bnegativ\w*\b/.test(plain);
    const affirmative = /\bafirmativ\w*\b|\baffirmativ\w*\b/.test(plain);
    const hasTu = words.has("tu");
    const hasVos = words.has("vosotros") || words.has("vosotras");
    const people = hasTu !== hasVos ? [hasTu ? "tu" : "vos"] : ["tu", "vos"];
    const types = negative ? (affirmative ? ["commands", "negative"] : ["negative"]) : ["commands"];
    return { focuses: types.flatMap(type => people.map(person => `${type}-${person}` as Focus)), verbs: selectedVerbs };
  }
  if (/\bser\b/.test(plain) && /\bestar\b/.test(plain)) return { focuses:["ser-estar"], verbs:selectedVerbs };
  const past = /preterit|indefinid|simple past/.test(plain);
  const imperfect = /imperfect/.test(plain);
  if (past || imperfect) return { focuses:[past && imperfect ? "past-choice" : past ? "preterite" : "imperfect"], verbs:selectedVerbs };
  if (/\bpresent[ea]?\b/.test(plain)) {
    return { focuses:[/irregular|stem.chang|raiz/.test(plain) ? "present-irregular" : "present-regular"], verbs:selectedVerbs };
  }
  return { focuses:[], verbs:selectedVerbs };
}

export function exercisesFor(topic: TopicContent): Exercise[] {
  const bank = topic.focuses.flatMap(focus => {
    const exercises = allExercises.filter(exercise => exercise.id.startsWith(focus + ":"));
    const matches = exercises.filter(exercise => topic.verbs.includes(exercise.skill.split(":")[1]));
    return matches.length ? matches : exercises;
  });
  return [...bank, ...topic.custom];
}

function variants(exercises: Exercise[], seed: number) {
  const seen = new Set<string>();
  return exercises.filter(exercise => !seen.has(exercise.skill) && seen.add(exercise.skill))
    .map(exercise => {
      const related = exercises.filter(option => option.skill === exercise.skill);
      return related[seed % related.length];
    });
}

export function planPractice(topic: Topic, due: Exercise[], previous: Map<string, Exercise>, seed: number, customBank: Exercise[] = []): Exercise[] {
  const practice = exercisesFor(topic);
  const pool = [...allExercises, ...customBank];
  const review = due.slice(0, 2).map(exercise => {
    const alternatives = pool.filter(option => option.skill === exercise.skill && option.id !== exercise.id);
    return { ...(alternatives.length ? alternatives[seed % alternatives.length] : exercise), review: true };
  });
  const priority = topic.id === starterTopic.id
    ? ["commands-tu:pasar", "commands-vos:pasar", "commands-tu:hacer", "commands-vos:hacer",
      "commands-tu:abrir", "commands-vos:abrir", "commands-tu:mover", "commands-vos:mover"]
    : [];
  const byFocus = [...topic.focuses.map(focus => practice.filter(exercise => exercise.id.startsWith(focus + ":"))), topic.custom];
  const groups = byFocus.map(group => variants(group, seed).map(exercise => exercise.skill));
  const interleaved = Array.from({ length: Math.max(...groups.map(group => group.length), 0) }, (_, index) =>
    groups.flatMap(group => group[index] ?? []),
  ).flat();
  const order = priority.length ? priority : interleaved;
  const ranked = [...practice].sort((left, right) => order.indexOf(left.skill) - order.indexOf(right.skill));
  const fresh = variants(ranked, topic.id === starterTopic.id && !previous.size ? 0 : seed)
    .filter(exercise => !review.some(item => item.skill === exercise.skill))
    .map(exercise => {
      if (previous.get(exercise.skill)?.id !== exercise.id) return exercise;
      return ranked.find(item => item.skill === exercise.skill && item.id !== exercise.id) ?? exercise;
    });
  return [...review, ...fresh].slice(0, 8);
}

export function isCorrect(answer: string, expected: string) {
  const normalize = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/[.!?¡¿]+$/g, "").replace(/\s+/g, " ").trim();
  return normalize(answer) === normalize(expected);
}

export function publicExercise(exercise: Exercise): PublicExercise {
  const { id, label, scene, sentence, cue, review } = exercise;
  return { id, label, scene, sentence, cue, review };
}
