import { DatabaseSync } from "node:sqlite"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = process.env.DB_FILE ?? path.join(root, "data", "scacchi.db");
fs.mkdirSync(path.dirname(file), { recursive: true });
export const db = new DatabaseSync(file);
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
db.exec(fs.readFileSync(path.join(root, "server", "schema.sql"), "utf8"));
const conv = (v: unknown) => (typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v);
// Stessa interfaccia di prima ($1, $2… e { rows }) sopra SQLite.
export async function q(text: string, params: unknown[] = []) {
  const rows = db.prepare(text.replace(/\$(\d+)/g, "?$1")).all(...(params.map(conv) as never[])) as Record<string, any>[];
  return { rows };
}
