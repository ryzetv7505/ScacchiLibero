import { useEffect, useRef, useState } from "react"; import { Chess } from "chess.js"; import { useNavigate } from "react-router-dom";
import EndDialog from "../components/EndDialog"; import Board from "../components/Board"; import Gate from "../components/Gate"; import { beep, getToken, useAuth } from "../api";
const CTL = { bullet: "Bullet 1+0", blitz: "Blitz 3+2", rapid: "Rapid 10+0" } as const; type Ctl = keyof typeof CTL;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export default function Online() {
  const { me } = useAuth(); const nav = useNavigate();
  const [ctl, setCtl] = useState<Ctl>("rapid"), [rated, setRated] = useState(true), [phase, setPhase] = useState<"idle" | "seek" | "play" | "end">("idle");
  const ws = useRef<WebSocket | null>(null), game = useRef(new Chess()), room = useRef(""), inc = useRef(0), colorRef = useRef<"w" | "b">("w");
  const [fen, setFen] = useState(game.current.fen()), [color, setColor] = useState<"w" | "b">("w"), [clock, setClock] = useState<[number, number]>([0, 0]), [result, setResult] = useState("");
  const [dlgClosed, setDlgClosed] = useState(false);
  const send = (o: object) => ws.current?.send(JSON.stringify(o));
  useEffect(() => { if (phase !== "play") return; let last = Date.now();
    const id = setInterval(() => { const now = Date.now(), dt = (now - last) / 1000; last = now;
      setClock((c) => { const n: [number, number] = [...c]; const i = game.current.turn() === "w" ? 0 : 1; n[i] = Math.max(0, n[i] - dt); return n; }); }, 200);
    return () => clearInterval(id); }, [phase]);
  useEffect(() => { if (phase === "play" && clock[color === "w" ? 0 : 1] <= 0) { send({ t: "resign", room: room.current }); setResult("Tempo scaduto: hai perso"); setPhase("end"); } }, [clock]);
  useEffect(() => () => ws.current?.close(), []);
  if (!me) return <Gate />;
  const addInc = (c: "w" | "b") => setClock((p) => (c === "w" ? [p[0] + inc.current, p[1]] : [p[0], p[1] + inc.current]));
  const seek = () => {
    const w = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?token=${getToken()}`); ws.current = w;
    w.onopen = () => { w.send(JSON.stringify({ t: "seek", control: ctl, rated: rated && !me.is_guest })); setPhase("seek"); };
    w.onmessage = (e) => { const m = JSON.parse(e.data);
      if (m.t === "start") { game.current = new Chess(); setFen(game.current.fen()); room.current = m.room; setColor(m.color); colorRef.current = m.color; setDlgClosed(false); inc.current = m.time[1]; setClock([m.time[0], m.time[0]]); setPhase("play"); }
      else if (m.t === "move") { const mover = game.current.turn(); game.current.move(m.move); addInc(mover); setFen(game.current.fen()); beep(); }
      else if (m.t === "end") { setResult((p) => p || (m.result === "1/2-1/2" ? "Patta" : (m.result === "1-0") === (colorRef.current === "w") ? "Hai vinto!" : "Hai perso")); setPhase("end"); w.close(); } };
    w.onclose = () => setPhase((p) => (p === "seek" ? "idle" : p));
  };
  const onMove = (mv: { from: string; to: string; promotion?: string }) => {
    if (phase !== "play" || game.current.turn() !== color) return false;
    try { game.current.move(mv); } catch { return false; }
    addInc(color); setFen(game.current.fen()); beep(); send({ t: "move", room: room.current, move: mv }); return true;
  };
  const mine = me.ratings.find((r) => r.control === ctl);
  const Clock = ({ c }: { c: "w" | "b" }) => <span className={"clock" + (phase === "play" && game.current.turn() === c ? " on" : "")}>{fmt(clock[c === "w" ? 0 : 1])}</span>;
  const opp: "w" | "b" = color === "w" ? "b" : "w";
  return (<>
    <h1>Gioca online</h1><p className="lead">Sfide contro altri giocatori con avversari entro ±100 Elo. Gratis, senza pubblicità.</p>
    <div className="layout" style={{ ["--bsz" as string]: "calc(100dvh - 235px)" }}>
      <div>{phase === "play" || phase === "end" ? <><div className="who"><b>Avversario</b><Clock c={opp} /></div>
        <Board fen={fen} orientation={color === "w" ? "white" : "black"} onMove={onMove} mine={color} disabled={phase !== "play"} />
        <div className="who"><b>{me.username}</b><Clock c={color} /></div></> : <Board fen={fen} disabled />}</div>
      <aside className="panel">
        {phase === "idle" && <>
          <div className="rail">{(Object.keys(CTL) as Ctl[]).map((k) => <button key={k} className="chip" aria-pressed={ctl === k} onClick={() => setCtl(k)}>{CTL[k]}</button>)}</div>
          <label className="row"><input type="checkbox" style={{ width: 18 }} checked={rated && !me.is_guest} disabled={me.is_guest} onChange={(e) => setRated(e.target.checked)} />Partita classificata{me.is_guest && " (serve un account)"}</label>
          {mine && <div className="status">Il tuo rating {ctl}: <b>{Math.round(mine.rating)}</b> ({mine.games} partite)</div>}
          <button className="btn" onClick={seek}>Cerca avversario</button></>}
        {phase === "seek" && <><div className="status on" role="status">Cerco un avversario vicino al tuo livello… la ricerca si allarga col tempo.</div>
          <button className="btn ghost" onClick={() => { ws.current?.close(); setPhase("idle"); }}>Annulla</button></>}
        {phase === "play" && <><div className="status">Giochi con il {color === "w" ? "Bianco" : "Nero"} · {game.current.turn() === color ? "tocca a te" : "tocca all'avversario"}</div>
          <button className="btn ghost" onClick={() => { if (confirm("Vuoi abbandonare?")) send({ t: "resign", room: room.current }); }}>Abbandona</button></>}
        {phase === "end" && <><div className="status on" role="status">{result}</div>
          <button className="btn" onClick={() => nav("/review", { state: { pgn: game.current.pgn() } })}>Analizza la partita</button>
          <button className="btn ghost" onClick={() => { setPhase("idle"); setResult(""); game.current = new Chess(); setFen(game.current.fen()); }}>Nuova sfida</button></>}
      </aside></div>{phase === "end" && !dlgClosed && <EndDialog mate={game.current.isCheckmate()} title={game.current.isCheckmate() ? "Scacco matto" : result.startsWith("Tempo") ? "Tempo scaduto" : result === "Patta" ? "Patta" : "Partita terminata"} sub={result}
      onReview={() => nav("/review", { state: { pgn: game.current.pgn(), auto: true } })} onClose={() => setDlgClosed(true)} />}</>);
}
