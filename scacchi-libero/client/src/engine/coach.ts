import { Chess } from "chess.js"; import { Engine, Line } from "./stockfish"; import { Class, classify, wp } from "./review";
export interface Tip { cls?: Class; text: string }
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as const;
const NOME = { p: "un pedone", n: "un cavallo", b: "un alfiere", r: "una torre", q: "la donna", k: "il re" } as const;
const OPENINGS: [string, string][] = [["e4 e5 Nf3 Nc6 Bb5", "Partita Spagnola"], ["e4 e5 Nf3 Nc6 Bc4", "Partita Italiana"], ["e4 e5 Nf3 Nf6", "Difesa Russa"], ["e4 e5", "Aperture di Re"], ["e4 c5", "Difesa Siciliana"], ["e4 e6", "Difesa Francese"], ["e4 c6", "Difesa Caro-Kann"], ["d4 d5 c4", "Gambetto di Donna"], ["d4 Nf6 c4 g6", "Difesa Est-Indiana"], ["d4 d5", "Partita di Donna"], ["d4 Nf6", "Difesa Indiana"], ["c4", "Apertura Inglese"], ["Nf3", "Apertura Réti"]];
const opening = (h: string[]) => OPENINGS.find(([p]) => h.join(" ").startsWith(p))?.[1];
const neg = (l: Line): Line => ({ ...l, cp: l.cp === null ? null : -l.cp, mate: l.mate === null ? null : -l.mate });
const san = (fen: string, u: string) => new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
// Commento dopo ogni tua mossa: voto, cosa minaccia l'avversario, mossa migliore, nome dell'apertura.
export async function coach(engine: Engine, before: string, mv: { from: string; to: string; promotion?: string }): Promise<Tip> {
  const best = (await engine.search(before, { depth: 12 }))[0]; const c = new Chess(before); const played = c.move(mv); const after = c.fen();
  if (c.isCheckmate()) return { cls: "eccellente", text: "Scacco matto! Hai chiuso la partita." };
  const next = c.isGameOver() ? undefined : (await engine.search(after, { depth: 12 }))[0];
  const loss = Math.max(0, wp(best) - (next ? wp(neg(next)) : 50)), cls = classify(loss), bestSan = san(before, best.pv[0]).san, op = opening(c.history());
  if (cls === "eccellente" || cls === "buona") return { cls, text: `${played.san}: ${cls === "eccellente" ? "ottima mossa" : "mossa solida"}.${op && c.history().length <= 12 ? ` Siamo in ${op}.` : ""}${played.san === bestSan ? "" : ` Il motore preferiva ${bestSan}, ma va bene così.`}` };
  let threat = ""; if (next) { const r = san(after, next.pv[0]); threat = r.san.includes("#") ? ` Ora l'avversario può dare matto con ${r.san}!` : r.captured ? ` Ora l'avversario può giocare ${r.san} e prendere ${NOME[r.captured]}.` : ` L'avversario risponderebbe con ${r.san}.`; }
  return { cls, text: `${played.san} è ${cls === "imprecisione" ? "un'imprecisione" : cls === "errore" ? "un errore" : "un errore grave"}.${threat} Meglio ${bestSan}. Guarda sempre cosa minaccia l'avversario prima di muovere.` };
}
// "Spiegami la posizione": valutazione, materiale e piano consigliato.
export async function explain(engine: Engine, fen: string, mine: "w" | "b"): Promise<Tip> {
  const c = new Chess(fen), [l] = await engine.search(fen, { depth: 14 }), sg = c.turn() === mine ? 1 : -1;
  const cp = (l.mate !== null ? (l.mate > 0 ? 9999 : -9999) : l.cp ?? 0) * sg; let w = 0, b = 0;
  for (const row of c.board()) for (const p of row) if (p) { if (p.color === "w") w += VAL[p.type]; else b += VAL[p.type]; }
  const md = mine === "w" ? w - b : b - w;
  const st = cp > 300 ? "Sei in netto vantaggio" : cp > 100 ? "Sei in vantaggio" : cp > -100 ? "La posizione è equilibrata" : cp > -300 ? "Sei un po' in difficoltà" : "Sei in difficoltà";
  const mat = md === 0 ? "Il materiale è pari" : md > 0 ? `Hai ${md} punti di materiale in più` : `Hai ${-md} punti di materiale in meno`;
  return { text: `${st}. ${mat}. ${c.turn() === mine ? "Ti consiglio" : "L'avversario punta a"} ${san(fen, l.pv[0]).san}.` };
}
