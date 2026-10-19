import { WebSocketServer, WebSocket } from "ws";
import { Chess } from "chess.js";
import { q } from "./db.js"; import { verify } from "./auth.js"; import { update } from "./glicko2.js";

type Control = "bullet" | "blitz" | "rapid";
const TIMES: Record<Control, [number, number]> = { bullet: [60, 0], blitz: [180, 2], rapid: [600, 0] }; // [secondi, incremento]
interface Waiting { uid: number; ws: WebSocket; control: Control; rated: boolean; rating: number; since: number }
interface Room { id: string; w: Waiting; b: Waiting; chess: Chess; rated: boolean; control: Control }
const queue: Waiting[] = []; const rooms = new Map<string, Room>();
const send = (ws: WebSocket, m: object) => ws.readyState === 1 && ws.send(JSON.stringify(m));

// Range ±100 che si allarga di 25 ogni 5 secondi in coda (max ±300)
const window_ = (w: Waiting) => Math.min(300, 100 + Math.floor((Date.now() - w.since) / 5000) * 25);

function tryMatch() {
  for (const a of queue) for (const b of queue) {
    if (a === b || a.control !== b.control || a.rated !== b.rated || a.uid === b.uid) continue;
    if (Math.abs(a.rating - b.rating) <= Math.min(window_(a), window_(b))) {
      queue.splice(queue.indexOf(a), 1); queue.splice(queue.indexOf(b), 1);
      const [w, bl] = Math.random() < 0.5 ? [a, b] : [b, a];
      const room: Room = { id: crypto.randomUUID(), w, b: bl, chess: new Chess(), rated: a.rated, control: a.control };
      rooms.set(room.id, room);
      send(w.ws, { t: "start", room: room.id, color: "w", time: TIMES[a.control] });
      send(bl.ws, { t: "start", room: room.id, color: "b", time: TIMES[a.control] });
      return;
    }
  }
}
async function finish(r: Room, result: string) {
  rooms.delete(r.id);
  const g = await q("INSERT INTO games(white_id,black_id,control,rated,pgn,result) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [r.w.uid, r.b.uid, r.control, r.rated, r.chess.pgn(), result]);
  if (r.rated) {
    const s = result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
    const get = async (u: number) => (await q("SELECT rating,rd,vol FROM ratings WHERE user_id=$1 AND control=$2", [u, r.control])).rows[0];
    const [rw, rb] = [await get(r.w.uid), await get(r.b.uid)];
    const nw = update(rw, [{ r: rb, score: s }]), nb = update(rb, [{ r: rw, score: 1 - s }]);
    for (const [u, n] of [[r.w.uid, nw], [r.b.uid, nb]] as const)
      await q("UPDATE ratings SET rating=$3,rd=$4,vol=$5,games=games+1 WHERE user_id=$1 AND control=$2", [u, r.control, n.rating, n.rd, n.vol]);
  }
  for (const p of [r.w, r.b]) send(p.ws, { t: "end", result, gameId: g.rows[0].id });
}

export function attachWS(server: import("http").Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  setInterval(tryMatch, 1000);
  wss.on("connection", (ws, req) => {
    const uid = verify(new URL(req.url!, "http://x").searchParams.get("token") ?? "");
    if (!uid) return ws.close(4401);
    ws.on("message", async (raw) => {
      const m = JSON.parse(String(raw));
      if (m.t === "seek") {
        const control: Control = m.control;
        const r = await q("SELECT rating FROM ratings WHERE user_id=$1 AND control=$2", [uid, control]);
        queue.push({ uid, ws, control, rated: !!m.rated, rating: r.rows[0].rating, since: Date.now() });
      } else if (m.t === "move") {
        const room = rooms.get(m.room); if (!room) return;
        const turn = room.chess.turn(), p = turn === "w" ? room.w : room.b;
        if (p.uid !== uid) return;
        try { room.chess.move(m.move); } catch { return send(ws, { t: "illegal" }); }
        send((turn === "w" ? room.b : room.w).ws, { t: "move", move: m.move });
        if (room.chess.isGameOver()) await finish(room, room.chess.isDraw() ? "1/2-1/2" : turn === "w" ? "1-0" : "0-1");
      } else if (m.t === "resign") {
        const room = rooms.get(m.room); if (room) await finish(room, room.w.uid === uid ? "0-1" : "1-0");
      }
    });
    ws.on("close", () => { const i = queue.findIndex((w) => w.ws === ws); if (i >= 0) queue.splice(i, 1); });
  });
}
