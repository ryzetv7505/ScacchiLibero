import { Chess } from "chess.js"; import { Engine, Line } from "./stockfish";
export type Class = "eccellente" | "buona" | "imprecisione" | "errore" | "errore grave";
export interface Reviewed { san: string; fen: string; cls: Class; loss: number; best: string; why: string }
export const wp = (l: Line) => l.mate !== null ? (l.mate > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * (l.cp ?? 0))) - 1);
export const classify = (loss: number): Class => loss <= 2 ? "eccellente" : loss <= 5 ? "buona" : loss <= 10 ? "imprecisione" : loss <= 20 ? "errore" : "errore grave";
function explain(cls: Class, san: string, best: string, before: Line, after: Line | undefined, loss: number): string {
  if (cls === "eccellente") return san === best ? "È la mossa migliore della posizione." : "Mossa equivalente alla migliore.";
  if (cls === "buona") return `Mossa solida; il motore preferiva ${best}, ma la differenza è minima.`;
  if (before.mate !== null && before.mate > 0) return `Perdevi un matto forzato in ${before.mate}: ${best} era la strada.`;
  if (after && after.mate !== null && after.mate > 0) return `Questa mossa permette all'avversario un matto in ${after.mate}.`;
  return `Hai perso circa ${loss.toFixed(0)}% di probabilità di vittoria. ${best} manteneva meglio la posizione.`;
}
// Nessun limite di partite o profondità. L'analisi procede mossa per mossa e parte subito.
export async function reviewGame(pgn: string, engine: Engine, depth = 16, onStep?: (i: number, r: Reviewed) => void): Promise<Reviewed[]> {
  const game = new Chess(); game.loadPgn(pgn);
  const sans = game.history(); const c = new Chess(); const out: Reviewed[] = [];
  let prev = (await engine.search(c.fen(), { depth }))[0];
  for (let i = 0; i < sans.length; i++) {
    const bu = prev.pv[0]; const bestSan = new Chess(c.fen()).move({ from: bu.slice(0, 2), to: bu.slice(2, 4), promotion: bu[4] }).san;
    c.move(sans[i]);
    const next = c.isGameOver() ? undefined : (await engine.search(c.fen(), { depth }))[0];
    const after: Line | undefined = next && { ...next, cp: next.cp === null ? null : -next.cp, mate: next.mate === null ? null : -next.mate };
    const loss = Math.max(0, wp(prev) - (after ? wp(after) : c.isCheckmate() ? 100 : 50));
    const cls = classify(loss);
    const r: Reviewed = { san: sans[i], fen: c.fen(), cls, loss, best: bestSan, why: explain(cls, sans[i], bestSan, prev, after, loss) };
    out.push(r); onStep?.(i, r); if (next) prev = next;
  }
  return out;
}
