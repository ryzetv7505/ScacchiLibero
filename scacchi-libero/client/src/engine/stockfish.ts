// Wrapper UCI per Stockfish WASM in un Web Worker (non blocca il thread UI → scacchiera a 60fps).
export interface Line { cp: number | null; mate: number | null; pv: string[]; depth: number }
export class Engine {
  private w = new Worker("/stockfish/stockfish-nnue-16-single.js");
  private ready: Promise<void>;
  private listener: ((l: string) => void) | null = null;
  constructor() {
    this.w.onmessage = (e) => this.listener?.(String(e.data));
    this.ready = this.cmd("uci", "uciok").then(() => this.cmd("isready", "readyok")).then(() => {});
  }
  private cmd(c: string, until: string): Promise<string[]> {
    return new Promise((res) => { const out: string[] = [];
      this.listener = (l) => { out.push(l); if (l.startsWith(until)) { this.listener = null; res(out); } };
      this.w.postMessage(c); });
  }
  set(name: string, v: string | number) { this.w.postMessage(`setoption name ${name} value ${v}`); }
  async search(fen: string, o: { depth?: number; movetime?: number; multipv?: number; skill?: number } = {}): Promise<Line[]> {
    await this.ready;
    this.set("MultiPV", o.multipv ?? 1); this.set("Skill Level", o.skill ?? 20);
    this.w.postMessage(`position fen ${fen}`);
    const out = await this.cmd(o.movetime ? `go movetime ${o.movetime}` : `go depth ${o.depth ?? 14}`, "bestmove");
    const best = new Map<number, Line>();
    for (const l of out) {
      const m = l.match(/depth (\d+).*multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)/);
      if (m) best.set(+m[2], { depth: +m[1], cp: m[3] === "cp" ? +m[4] : null, mate: m[3] === "mate" ? +m[4] : null, pv: m[5].split(" ") });
    }
    return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }
  destroy() { this.w.terminate(); }
}
