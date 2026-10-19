// Va importato per primo: carica server/.env con il loader integrato di Node (niente dotenv).
import path from "node:path"; import { fileURLToPath } from "node:url";
try { process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env")); } catch { /* .env assente: valori di default */ }
