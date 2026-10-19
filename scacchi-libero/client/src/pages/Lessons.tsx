import { useState } from "react"; import { Chess } from "chess.js"; import Board from "../components/Board"; import { LESSONS } from "../data/lessons"; import { t } from "../i18n";
export default function Lessons() {
  const [li, setLi] = useState(0), [si, setSi] = useState(0), [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const lesson = LESSONS[li], step = lesson.steps[si];
  const onMove = (m: { from: string; to: string; promotion?: string }) => {
    const c = new Chess(step.fen); let san: string;
    try { san = c.move(m).san; } catch { return false; }
    const ok = step.solution.includes(san); setFb({ ok, text: ok ? `${t.correct} ${step.explain}` : t.wrong }); return ok;
  };
  return (<>
    <h1>Lezioni</h1><p className="lead">Una posizione, una domanda: trova la mossa e scopri subito perché funziona.</p>
    <div className="layout"><Board key={step.fen} fen={step.fen} onMove={onMove} />
      <aside className="panel">
        <div className="rail">{LESSONS.map((l, i) => <button key={l.id} className="chip" aria-pressed={i === li} onClick={() => { setLi(i); setSi(0); setFb(null); }}>{l.title}</button>)}</div>
        <div className="why"><small style={{ color: "var(--muted)" }}>{lesson.level} · passo {si + 1} di {lesson.steps.length}</small><br /><b>{step.prompt}</b></div>
        {fb && <div className={"fb " + (fb.ok ? "ok" : "ko")} role="status">{fb.text}</div>}
        {fb?.ok && si < lesson.steps.length - 1 && <div className="row"><button className="btn" onClick={() => { setSi(si + 1); setFb(null); }}>Prossimo passo</button></div>}
      </aside></div></>);
}
