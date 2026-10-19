import { useMemo, useRef, useState } from "react"; import { Chess } from "chess.js"; import { useNavigate } from "react-router-dom";
import Board from "../components/Board"; import EndDialog from "../components/EndDialog"; import { Engine } from "../engine/stockfish"; import { BOTS, Bot, botMove } from "../engine/bots";
import { coach, explain, Tip } from "../engine/coach"; import { api, beep, useAuth } from "../api";
const ring = (elo: number) => `hsl(${Math.round(200 - (elo / 2600) * 170)} 80% 62%)`;
const cc = (c?: string) => (c ? "c-" + (c === "errore grave" ? "grave" : c) : "c-info");
export default function PlayBot() {
  const { me } = useAuth(); const nav = useNavigate(); const [bot, setBot] = useState<Bot>(BOTS[4]); const game = useRef(new Chess()); const [fen, setFen] = useState(game.current.fen());
  const engine = useMemo(() => new Engine(), []), brain = useMemo(() => new Engine(), []); // brain = istruttore e suggerimenti
  const [busy, setBusy] = useState(false), [thinking, setThinking] = useState(false), [my, setMy] = useState<"w" | "b">("w"), [flip, setFlip] = useState(false), [closed, setClosed] = useState(false);
  const [hint, setHint] = useState<{ uci: string; text: string } | null>(null), [feed, setFeed] = useState<Tip[]>([]), [coachOn, setCoachOn] = useState(true), saved = useRef(false), [copied, setCopied] = useState(false);
  const g = game.current, hist = g.history({ verbose: true }), lastM = hist[hist.length - 1], over = g.isGameOver();
  const result = g.isCheckmate() ? (g.turn() === "w" ? "0-1" : "1-0") : "1/2-1/2";
  if (over && !saved.current && me) { saved.current = true; api("/games/bot", { body: { botId: bot.id, pgn: g.pgn(), result, color: my } }).catch(() => {}); }
  const iWon = g.isCheckmate() && g.turn() !== my;
  const status = over ? (g.isCheckmate() ? (iWon ? "Scacco matto: hai vinto!" : `Scacco matto: vince ${bot.name}`) : "Partita patta") : busy ? `${bot.name} sta pensando…` : g.inCheck() ? "Sei sotto scacco" : `Tocca a te, hai il ${my === "w" ? "Bianco" : "Nero"}`;
  async function reply(b: Bot) {
    if (game.current.isGameOver()) return; setBusy(true);
    const uci = await botMove(engine, b, game.current.fen(), game.current.history());
    game.current.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); setFen(game.current.fen()); setBusy(false); beep();
  }
  const reset = (b = bot, c = my) => { setBot(b); setMy(c); setHint(null); setFeed([]); setClosed(false); saved.current = false; game.current = new Chess(); setFen(game.current.fen()); setBusy(false); if (c === "b") reply(b); };
  const onMove = (m: { from: string; to: string; promotion?: string }) => {
    if (busy || game.current.turn() !== my) return false; const before = game.current.fen();
    try { game.current.move(m); } catch { return false; }
    setHint(null); setFen(game.current.fen()); beep();
    if (coachOn) { setThinking(true); coach(brain, before, m).then((t) => setFeed((f) => [...f.slice(-7), t])).finally(() => setThinking(false)); }
    reply(bot); return true;
  };
  const ask = async (kind: "hint" | "explain") => {
    if (busy || over || thinking || game.current.turn() !== my) return; setThinking(true);
    if (kind === "explain") setFeed((f) => [...f.slice(-7), { text: "…" }]);
    if (kind === "explain") { const t = await explain(brain, game.current.fen(), my); setFeed((f) => [...f.slice(0, -1), t]); }
    else { const [l] = await brain.search(game.current.fen(), { depth: 14 }), u = l.pv[0];
      const s = new Chess(game.current.fen()).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
      setHint({ uci: u, text: `Prova ${s} (${l.mate !== null ? "matto in " + Math.abs(l.mate) : "valutazione " + ((l.cp ?? 0) / 100).toFixed(1)})` }); }
    setThinking(false);
  };
  const undo = () => { if (busy || hist.length < 1) return; game.current.undo(); if (game.current.turn() !== my) game.current.undo(); setHint(null); saved.current = false; setClosed(false); setFen(game.current.fen()); };
  const copy = async () => { await navigator.clipboard.writeText(g.pgn()); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const rows = []; for (let i = 0; i < hist.length; i += 2) rows.push([i / 2 + 1, hist[i].san, hist[i + 1]?.san ?? ""]);
  return (<>
    <h1>Gioca contro i bot</h1><p className="lead">Tredici avversari da 250 a 2600 Elo.</p>
    <div className="layout">
      <Board fen={fen} onMove={onMove} orientation={(my === "w") !== flip ? "white" : "black"} mine={my} disabled={busy || over} last={lastM ? [lastM.from, lastM.to] : undefined} arrows={hint ? [[hint.uci.slice(0, 2), hint.uci.slice(2, 4)]] : []} />
      <aside className="panel">
        <div className="bot"><div className="avatar" style={{ background: ring(bot.elo), ["--ring" as string]: ring(bot.elo) }}>{bot.name[0]}</div>
          <div><h2>{bot.name}<span className="elo">{bot.elo}</span></h2><small>{bot.desc} · stile {bot.style}</small></div></div>
        <div className={"status" + (busy ? " on" : "")} role="status">{status}</div>
        <div className="coach" aria-live="polite"><b>Istruttore</b>{!coachOn && <small> (spento)</small>}
          {feed.length === 0 && coachOn && <small style={{ display: "block", color: "var(--muted)" }}>Gioca una mossa: ti dirò cosa ne penso.</small>}
          {feed.slice(-3).map((t, i) => <div key={i} className="tip"><span className={"dot " + cc(t.cls)} />{t.text}</div>)}{thinking && <small style={{ color: "var(--muted)" }}>sto analizzando…</small>}</div>
        {hint && <div className="why">{hint.text}</div>}
        <div className="rail" role="group" aria-label="Scegli avversario">{BOTS.map((b) => <button key={b.id} className="chip" aria-pressed={b.id === bot.id} onClick={() => reset(b)}>{b.name} {b.elo}</button>)}</div>
        <div className="rail"><button className="chip" aria-pressed={my === "w"} onClick={() => reset(bot, "w")}>Bianco</button><button className="chip" aria-pressed={my === "b"} onClick={() => reset(bot, "b")}>Nero</button>
          <button className="chip" aria-pressed={coachOn} onClick={() => setCoachOn(!coachOn)}>Istruttore {coachOn ? "acceso" : "spento"}</button></div>
        <div className="moves" aria-label="Mosse">{rows.map(([n, a, b]) => <><span className="n">{n}.</span><span>{a}</span><span>{b}</span></>)}</div>
        <div className="row"><button className="btn" onClick={() => ask("hint")} disabled={busy || over || thinking}>Suggerimento</button><button className="btn ghost" onClick={() => ask("explain")} disabled={busy || over || thinking}>Spiegami</button>
          <button className="btn ghost" onClick={undo}>Annulla</button><button className="btn ghost" onClick={() => setFlip(!flip)}>Ruota</button><button className="btn ghost" onClick={copy}>{copied ? "Copiato!" : "PGN"}</button>
          <button className="btn ghost" onClick={() => (over || confirm("Vuoi abbandonare?")) && reset()}>{over ? "Nuova" : "Abbandona"}</button></div>
      </aside></div>
    {over && !closed && <EndDialog mate={g.isCheckmate()} title={g.isCheckmate() ? "Scacco matto" : g.isStalemate() ? "Stallo" : "Patta"} sub={g.isCheckmate() ? (iWon ? "Hai vinto! Complimenti." : `Ha vinto ${bot.name}.`) : "La partita finisce in parità."}
      onReview={() => nav("/review", { state: { pgn: g.pgn(), auto: true } })} onClose={() => setClosed(true)} onNew={() => reset()} />}</>);
}
