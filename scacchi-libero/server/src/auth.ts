import { Router, Request, Response, NextFunction } from "express";
import { createHmac, createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"; import { z } from "zod";
import { q } from "./db.js"; import { sendVerification } from "./mail.js";
const SECRET = process.env.JWT_SECRET ?? "dev"; const APP = process.env.APP_URL ?? "http://localhost:5173";
// Token firmati HMAC-SHA256 (formato JWT) con il solo modulo crypto
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const mac = (d: string) => createHmac("sha256", SECRET).update(d).digest("base64url");
const sign = (id: number) => { const d = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ id, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }); return d + "." + mac(d); };
export const verify = (t: string): number | null => {
  const [h, p, s] = t.split("."); if (!s) return null; const e = mac(h + "." + p);
  if (e.length !== s.length || !timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  try { const j = JSON.parse(Buffer.from(p, "base64url").toString()); return j.exp > Date.now() / 1000 ? j.id : null; } catch { return null; }
};
// Password con scrypt (integrato in Node, niente moduli nativi)
const sc = (p: string, s: Buffer) => new Promise<Buffer>((res, rej) => scrypt(p, s, 64, (e, k) => (e ? rej(e) : res(k))));
const hashPw = async (p: string) => { const s = randomBytes(16); return `scrypt$${s.toString("hex")}$${(await sc(p, s)).toString("hex")}`; };
const checkPw = async (p: string, h: string) => { const [, s, k] = h.split("$"); if (!s || !k) return false; const d = await sc(p, Buffer.from(s, "hex")), kb = Buffer.from(k, "hex"); return d.length === kb.length && timingSafeEqual(d, kb); };
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const iso = (plus = "") => `strftime('%Y-%m-%dT%H:%M:%SZ','now'${plus})`;
// Anti forza bruta: max 8 tentativi falliti ogni 15 minuti per IP+email
const fails = new Map<string, { n: number; t: number }>();
const limited = (k: string) => { const f = fails.get(k); return !!f && Date.now() - f.t < 9e5 && f.n >= 8; };
const fail = (k: string) => { const f = fails.get(k); fails.set(k, f && Date.now() - f.t < 9e5 ? { n: f.n + 1, t: f.t } : { n: 1, t: Date.now() }); };
async function initRatings(id: number) { for (const c of ["bullet", "blitz", "rapid"]) await q("INSERT INTO ratings(user_id,control) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, c]); }
async function issue(id: number, email: string) {
  const tok = randomBytes(32).toString("hex");
  await q(`UPDATE users SET verify_hash=$2, verify_expires=${iso(",'+24 hours'")} WHERE id=$1`, [id, sha(tok)]);
  return sendVerification(email, `${APP}/api/auth/verify?token=${tok}`);
}
export const auth = Router();
auth.post("/register", async (req, res) => {
  const b = z.object({ username: z.string().trim().min(3).max(20).regex(/^[\w.-]+$/, "Usa solo lettere, numeri, punto, trattino e underscore"), email: z.string().trim().email(), password: z.string().min(8).max(100) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: b.error.issues[0].message === "Required" ? "Compila tutti i campi" : b.error.issues[0].message });
  const email = b.data.email.toLowerCase();
  try {
    const r = await q("INSERT INTO users(username,email,password_hash,email_verified) VALUES($1,$2,$3,0) RETURNING id", [b.data.username, email, await hashPw(b.data.password)]);
    await initRatings(r.rows[0].id);
    const devLink = await issue(r.rows[0].id, email); res.json({ pending: true, devLink });
  } catch (e) {
    if (/UNIQUE/i.test(String((e as Error).message))) return res.status(409).json({ error: "Nome utente o email già in uso" });
    console.error(e); res.status(502).json({ error: "Account creato ma invio email non riuscito: usa «Reinvia email» dalla pagina di accesso" });
  }
});
auth.post("/login", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase(), key = req.ip + "|" + email;
  if (limited(key)) return res.status(429).json({ error: "Troppi tentativi: riprova tra qualche minuto" });
  const u = (await q("SELECT id,password_hash,email_verified FROM users WHERE email=$1", [email])).rows[0];
  if (!u || !(await checkPw(String(req.body.password ?? ""), u.password_hash))) { fail(key); return res.status(401).json({ error: "Email o password errate" }); }
  if (!u.email_verified) return res.status(403).json({ error: "Devi prima confermare la tua email", code: "unverified" });
  fails.delete(key); res.json({ token: sign(u.id) });
});
auth.post("/resend", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const r = await q("SELECT id FROM users WHERE email=$1 AND email_verified=0", [email]);
  let devLink: string | undefined; try { if (r.rows[0]) devLink = await issue(r.rows[0].id, email); } catch (e) { console.error(e); }
  res.json({ ok: true, devLink });
});
auth.get("/verify", async (req, res) => {
  const r = await q(`UPDATE users SET email_verified=1, verify_hash=NULL, verify_expires=NULL WHERE verify_hash=$1 AND verify_expires>${iso()} RETURNING id`, [sha(String(req.query.token ?? ""))]);
  res.redirect(`${APP}/login?verified=${r.rows[0] ? 1 : 0}`);
});
auth.post("/guest", async (_req, res) => {
  const r = await q("INSERT INTO users(username,is_guest,email_verified) VALUES('Ospite'||abs(random()%1000000),1,1) RETURNING id");
  await initRatings(r.rows[0].id); res.json({ token: sign(r.rows[0].id) });
});
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const id = verify((req.headers.authorization ?? "").replace("Bearer ", ""));
  if (!id) return res.status(401).json({ error: "Non autenticato" });
  (req as Request & { uid: number }).uid = id; next();
}
