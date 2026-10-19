import "./env.js";
import express from "express"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { auth, requireAuth } from "./auth.js"; import { attachWS } from "./matchmaking.js"; import { q } from "./db.js";
type AuthReq = express.Request & { uid: number };
const app = express(); app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", auth);
app.get("/api/me", requireAuth, async (req, res) => {
  const uid = (req as AuthReq).uid, u = (await q("SELECT id,username,is_guest FROM users WHERE id=$1", [uid])).rows[0];
  if (!u) return res.status(401).json({ error: "Non autenticato" });
  res.json({ ...u, is_guest: !!u.is_guest, ratings: (await q("SELECT control,rating,rd,games FROM ratings WHERE user_id=$1", [uid])).rows });
});
app.post("/api/games/bot", requireAuth, async (req, res) => {
  const { botId, pgn, result, color } = req.body, uid = (req as AuthReq).uid;
  const r = await q("INSERT INTO games(white_id,black_id,bot_id,control,rated,pgn,result) VALUES($1,$2,$3,'rapid',0,$4,$5) RETURNING id", [color === "w" ? uid : null, color === "b" ? uid : null, botId, pgn, result]);
  res.json({ id: r.rows[0].id });
});
app.get("/api/games", requireAuth, async (req, res) => {
  const uid = (req as AuthReq).uid;
  res.json((await q("SELECT id,bot_id,control,result,played_at FROM games WHERE white_id=$1 OR black_id=$1 ORDER BY played_at DESC LIMIT 100", [uid])).rows);
});
app.get("/api/games/:id", requireAuth, async (req, res) => {
  const uid = (req as AuthReq).uid, g = (await q("SELECT * FROM games WHERE id=$1 AND (white_id=$2 OR black_id=$2)", [req.params.id, uid])).rows[0];
  g ? res.json(g) : res.status(404).json({ error: "Partita non trovata" });
});
app.post("/api/lessons/progress", requireAuth, async (req, res) => {
  const { lessonId, step, solved } = req.body;
  await q("INSERT INTO lesson_progress VALUES($1,$2,$3,$4) ON CONFLICT (user_id,lesson_id,step) DO UPDATE SET solved=$4", [(req as AuthReq).uid, lessonId, step, solved]);
  res.json({ ok: true });
});
// Modalità produzione: Express serve anche il client compilato (un solo processo Node)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html"))); }
const server = http.createServer(app); attachWS(server);
const port = Number(process.env.PORT ?? 4000); server.listen(port, () => console.log(`API su :${port}`));
