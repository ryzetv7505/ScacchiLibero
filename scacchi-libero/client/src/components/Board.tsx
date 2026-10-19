import { useState } from "react"; import { Chessboard } from "react-chessboard"; import { Chess, Square } from "chess.js";
type Mv = { from: string; to: string; promotion?: string };
// Mostra tutte le mosse legali del pezzo selezionato (puntini; anello sulle catture). Funziona con trascinamento e con tocco/click.
export default function Board({ fen, onMove, orientation = "white", disabled, last, arrows, mine }:
  { fen: string; onMove?: (m: Mv) => boolean; orientation?: "white" | "black"; disabled?: boolean; last?: [string, string]; arrows?: [string, string][]; mine?: "w" | "b" }) {
  const [sel, setSel] = useState<string | null>(null); const chess = new Chess(fen); const side = mine ?? chess.turn();
  const targets = sel && !disabled ? chess.moves({ square: sel as Square, verbose: true }) : [];
  const st: Record<string, React.CSSProperties> = {}; last?.forEach((s) => (st[s] = { background: "rgba(244,182,63,.45)" }));
  if (sel && !disabled) { st[sel] = { background: "rgba(244,182,63,.7)" };
    targets.forEach((m) => (st[m.to] = { background: chess.get(m.to as Square) ? "radial-gradient(circle,transparent 55%,rgba(14,26,44,.5) 57%)" : "radial-gradient(circle,rgba(14,26,44,.45) 22%,transparent 24%)" })); }
  const pick = (sq: string) => { const p = chess.get(sq as Square); setSel(p && p.color === side && p.color === chess.turn() ? sq : null); };
  const click = (sq: string) => { if (disabled) return; if (targets.some((m) => m.to === sq)) { const from = sel!; setSel(null); onMove?.({ from, to: sq, promotion: "q" }); return; } pick(sq); };
  return (
    <div className="boardwrap" style={{ touchAction: "none" }}>
      <Chessboard position={fen} boardOrientation={orientation} arePiecesDraggable={!disabled} animationDuration={160}
        customDarkSquareStyle={{ backgroundColor: "#587a9c" }} customLightSquareStyle={{ backgroundColor: "#dde5ee" }}
        customBoardStyle={{ borderRadius: 10, overflow: "hidden" }} customSquareStyles={st} customArrows={(arrows ?? []) as never}
        onSquareClick={(sq) => click(sq)} onPieceDragBegin={(_p, sq) => !disabled && pick(sq)}
        onPieceDrop={(from, to) => { setSel(null); return onMove ? onMove({ from, to, promotion: "q" }) : false; }} />
    </div>);
}
