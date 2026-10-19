import { Chess } from "chess.js"; import { Engine, Line } from "./stockfish";
export type Style = "aggressivo" | "posizionale" | "tattico" | "difensivo";
export interface Bot { id: string; name: string; elo: number; style: Style; desc: string;
  skill: number; depth: number; multipv: number; temp: number; blunder: number }
// skill = Skill Level Stockfish (0–20). temp = rumore nella scelta tra candidate. blunder = prob. di mossa casuale.
// Valori iniziali: vanno calibrati con partite self-play (vedi README).
const B = (id: string, name: string, elo: number, style: Style, desc: string, skill: number, depth: number, multipv: number, temp: number, blunder: number): Bot =>
  ({ id, name, elo, style, desc, skill, depth, multipv, temp, blunder });
export const BOTS: Bot[] = [
  B("martin","Martin",250,"aggressivo","Principiante assoluto, regala pezzi",0,1,8,400,0.45),
  B("nelson","Nelson",400,"difensivo","Conosce le regole base",0,1,6,300,0.32),
  B("isabel","Isabel",600,"aggressivo","Cattura pezzi in presa",1,2,5,220,0.22),
  B("aaron","Aaron",800,"posizionale","Gioca aperture vere",3,3,4,160,0.14),
  B("wendy","Wendy",1000,"tattico","Solido, tattico",5,4,4,120,0.09),
  B("pablo","Pablo",1200,"difensivo","Forza da circolo",7,5,3,90,0.06),
  B("isla","Isla",1400,"posizionale","Strategico, punisce errori",10,6,3,70,0.04),
  B("phiona","Phiona",1600,"tattico","Club player",12,8,3,50,0.025),
  B("magnus","Magnus",1800,"posizionale","Forte, repertorio di aperture",14,10,3,35,0.012),
  B("hikaru","Hikaru",2000,"aggressivo","Quasi maestro",16,12,2,22,0.006),
  B("gukesh","Gukesh",2200,"tattico","Livello IM",18,14,2,12,0.002),
  B("firouzja","Firouzja",2400,"aggressivo","Livello GM",19,16,2,6,0),
  B("carlsen","Carlsen",2600,"posizionale","Livello campione del mondo",20,20,1,0,0),
];
const score = (l: Line) => l.mate !== null ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp ?? 0;
function styleBonus(style: Style, fen: string, uci: string): number {
  const c = new Chess(fen); const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  const cap = m.san.includes("x"), chk = m.san.includes("+") || m.san.includes("#");
  switch (style) {
    case "aggressivo": return (cap ? 25 : 0) + (chk ? 30 : 0);
    case "tattico": return (cap ? 15 : 0) + (chk ? 15 : 0);
    case "posizionale": return !cap && "nb".includes(m.piece) ? 15 : 0;
    case "difensivo": return m.piece === "k" || (m.piece === "p" && !cap) ? 12 : 0;
  }
}
// Libro di aperture: ogni partita segue una linea diversa (solo bot da 800 Elo in su)
const BOOK = [["e4","e5","Nf3","Nc6","Bb5"],["e4","e5","Nf3","Nc6","Bc4"],["e4","c5","Nf3","d6"],["e4","e6","d4","d5"],["e4","c6","d4","d5"],["d4","d5","c4","e6"],["d4","Nf6","c4","g6"],["Nf3","d5","g3"],["c4","e5","Nc3"],["d4","d5","Bf4"],["e4","e5","Nf3","Nf6"],["e4","d5","exd5","Qxd5"]];
export async function botMove(engine: Engine, bot: Bot, fen: string, history: string[] = []): Promise<string> {
  const legal = new Chess(fen).moves({ verbose: true }), uci = (m: (typeof legal)[number]) => m.from + m.to + (m.promotion ?? "");
  if (bot.elo >= 800 && history.length < 8) {
    const lines = BOOK.filter((l) => l.length > history.length && history.every((m, i) => l[i] === m));
    if (lines.length && Math.random() < 0.85) { const m = legal.find((x) => x.san === lines[Math.floor(Math.random() * lines.length)][history.length]); if (m) return uci(m); }
  }
  if (Math.random() < bot.blunder) return uci(legal[Math.floor(Math.random() * legal.length)]);
  const lines = await engine.search(fen, { depth: bot.depth, multipv: Math.min(Math.max(bot.multipv, 3), legal.length), skill: bot.skill });
  // Varietà: rumore casuale sulla valutazione (anche i bot più forti scelgono tra mosse quasi equivalenti) + bonus di stile
  const sc = lines.map((l) => score(l) + styleBonus(bot.style, fen, l.pv[0]) + (Math.random() - 0.5) * (bot.temp + 30));
  return lines[sc.indexOf(Math.max(...sc))].pv[0];
}
