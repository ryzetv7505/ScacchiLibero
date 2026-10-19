#!/usr/bin/env node
// ScacchiLibero — avvio completo con un solo comando, solo Node.js:   node avvia.mjs   (o: npm start)
// Opzione --prod: compila il client e serve tutto da un unico processo Node su http://localhost:4000
import { spawn, spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url)), server = path.join(root, "server"), client = path.join(root, "client");
const prod = process.argv.includes("--prod"), win = process.platform === "win32";
const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 13)) { console.error(`Serve Node.js 22.13 o superiore (hai ${process.versions.node}): https://nodejs.org`); process.exit(1); }
const run = (cmd, args, cwd, env = {}) => { const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win, env: { ...process.env, ...env } }); if (r.status !== 0) process.exit(r.status ?? 1); };

const envFile = path.join(server, ".env");
if (!fs.existsSync(envFile)) fs.writeFileSync(envFile, fs.readFileSync(path.join(root, ".env.example"), "utf8").replace("cambiami", crypto.randomBytes(24).toString("base64url")));

console.log("▸ Dipendenze (la prima volta ci vuole un po')…");
for (const d of [server, client]) run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], d);

// Motore Stockfish (WebAssembly) → cartella pubblica del client
const dst = path.join(client, "public", "stockfish"), src = path.join(client, "node_modules", "stockfish", "src"); fs.mkdirSync(dst, { recursive: true });
if (!fs.readdirSync(dst).some((f) => f.endsWith(".wasm")) && fs.existsSync(src)) {
  const all = fs.readdirSync(src).filter((f) => fs.statSync(path.join(src, f)).isFile());
  const pick = all.filter((f) => f.startsWith("stockfish-nnue-16-single")); for (const f of pick.length ? pick : all.filter((f) => f.startsWith("stockfish"))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
if (prod) { console.log("▸ Compilo il client…"); run("npx", ["vite", "build"], client); }

const kids = [];
const stop = (code = 0) => { for (const k of kids) { try { win ? spawnSync("taskkill", ["/pid", String(k.pid), "/T", "/F"]) : process.kill(-k.pid); } catch { /* già chiuso */ } } process.exit(code); };
const start = (args, cwd, env = {}) => { const c = spawn("npm", args, { cwd, stdio: "inherit", shell: win, detached: !win, env: { ...process.env, ...env } }); kids.push(c);
  c.on("exit", (code) => { if (code) { console.error(`\n✖ Un processo si è fermato (codice ${code}). Guarda l'errore qui sopra.`); stop(1); } }); };
process.on("SIGINT", () => stop()); process.on("SIGTERM", () => stop());

const url = prod ? "http://localhost:4000" : "http://localhost:5173";
start(prod ? ["start"] : ["run", "dev"], server, prod ? { NODE_ENV: "production" } : {});
if (!prod) start(["run", "dev"], client);
setTimeout(() => { console.log(`\n✔ Pronto: ${url}  (Ctrl+C per fermare tutto)`);
  try { spawn(win ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open", win ? ["/c", "start", "", url] : [url], { stdio: "ignore", detached: true }).on("error", () => {}).unref(); } catch { /* nessun browser */ } }, 5000);
