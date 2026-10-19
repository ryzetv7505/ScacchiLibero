// Glicko-2 (Glickman). Il centro della scala è 400 = rating iniziale dei nuovi giocatori.
const CENTER = 400, S = 173.7178;
export interface Rating { rating: number; rd: number; vol: number }
export const NEW_PLAYER: Rating = { rating: 400, rd: 350, vol: 0.06 };
const g = (p: number) => 1 / Math.sqrt(1 + (3 * p * p) / Math.PI ** 2);
const E = (m: number, mj: number, pj: number) => 1 / (1 + Math.exp(-g(pj) * (m - mj)));

export function update(p: Rating, opps: { r: Rating; score: number }[], tau = 0.5): Rating {
  const mu = (p.rating - CENTER) / S, phi = p.rd / S, sigma = p.vol;
  if (!opps.length) return { ...p, rd: Math.min(Math.sqrt(phi * phi + sigma * sigma) * S, 350) };
  let v = 0, dsum = 0;
  for (const o of opps) {
    const mj = (o.r.rating - CENTER) / S, pj = o.r.rd / S, e = E(mu, mj, pj);
    v += g(pj) ** 2 * e * (1 - e); dsum += g(pj) * (o.score - e);
  }
  v = 1 / v; const delta = v * dsum, a = Math.log(sigma * sigma);
  const f = (x: number) => { const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (tau * tau); };
  let A = a, B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * tau) < 0) k++; B = a - k * tau; }
  let fA = f(A), fB = f(B);
  while (Math.abs(B - A) > 1e-6) {
    const C = A + ((A - B) * fA) / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2;
    B = C; fB = fC;
  }
  const sig = Math.exp(A / 2), phiS = Math.sqrt(phi * phi + sig * sig);
  const phiN = 1 / Math.sqrt(1 / (phiS * phiS) + 1 / v);
  return { rating: S * (mu + phiN * phiN * dsum) + CENTER, rd: Math.max(phiN * S, 30), vol: sig };
}
