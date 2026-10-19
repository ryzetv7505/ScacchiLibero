import { useEffect, useMemo, useState } from "react"; import { useLocation } from "react-router-dom"; import Board from "../components/Board";
import { Engine } from "../engine/stockfish"; import { reviewGame, Reviewed } from "../engine/review"; import { t } from "../i18n";
const cc = (c: string) => "c-" + (c === "errore grave" ? "grave" : c);
export default function Review() {
  const [pgn, setPgn] = useState((useLocation().state as { pgn?: string } | null)?.pgn ?? ""); const [depth, setDepth] = useState(14); const [res, setRes] = useState<Reviewed[]>([]); const [sel, setSel] = useState(0); const [run_, setRun] = useState(false);
  const engine = useMemo(() => new Engine(), []);
  const run = async () => { setRes([]); setSel(0); setRun(true); try { await reviewGame(pgn, engine, depth, (_, r) => setRes((p) => [...p, r])); } finally { setRun(false); } };
  const loc = useLocation();
  useEffect(() => { if ((loc.state as { auto?: boolean } | null)?.auto && pgn) run(); }, []);
  const cur = res[sel];
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setSel((s) => Math.min(res.length - 1, s + 1)); if (e.key === "ArrowLeft") setSel((s) => Math.max(0, s - 1)); }; addEventListener("keydown", h); return () => removeEventListener("keydown", h); }, [res.length]);
  const acc = res.length ? Math.max(0, Math.round(100 - (res.reduce((a, r) => a + Math.min(r.loss, 40), 0) / res.length) * 1.2)) : 0;
  return (<>
    <h1>Revisione partite</h1><p className="lead">Analisi illimitata, per tutti. Incolla un PGN e ogni mossa riceve un voto con la spiegazione.</p>
    <div className="layout">
      <div>{cur ? <Board fen={cur.fen} disabled /> : <div className="panel"><textarea value={pgn} onChange={(e) => setPgn(e.target.value)} placeholder="Incolla qui il PGN della partita" rows={10} /></div>}</div>
      <aside className="panel">
        {res.length > 0 && <div className="status">Precisione: {acc}% · usa le frecce ← → per scorrere le mosse</div>}
        {cur && <div className="why"><b>{cur.san} · {t.cls[cur.cls]}</b><br />{cur.why}</div>}
        <div className="row"><label>Profondità <input type="number" min={8} max={30} value={depth} onChange={(e) => setDepth(+e.target.value)} /></label>
          <button className="btn" onClick={run} disabled={run_ || !pgn.trim()}>{run_ ? "Analisi in corso…" : "Analizza"}</button>
          {cur && <button className="btn ghost" onClick={() => setRes([])}>Cambia PGN</button>}</div>
        <div className="list">{res.map((r, i) => <div key={i} className="item" role="button" tabIndex={0} aria-current={i === sel} onClick={() => setSel(i)} onKeyDown={(e) => e.key === "Enter" && setSel(i)}>
          <span className={"dot " + cc(r.cls)} /><span>{Math.floor(i / 2) + 1}{i % 2 ? "…" : "."} {r.san}</span><small style={{ marginLeft: "auto", color: "var(--muted)" }}>{t.cls[r.cls]}</small></div>)}</div>
      </aside></div></>);
}
