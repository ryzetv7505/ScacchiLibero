# ScacchiLibero — scacchi gratis, senza abbonamenti né pubblicità
Licenza AGPL-3.0 
## Avvio (serve solo Node.js ≥ 22.13)
```bash
node avvia.mjs            # sviluppo: http://localhost:5173
node avvia.mjs --prod     # produzione: compila il client, tutto in un processo su :4000
```
Il database è un file SQLite (`data/scacchi.db`, modulo `node:sqlite` incluso in Node): niente Docker, niente PostgreSQL.

## Struttura
- `server/` Express + ws (TypeScript): auth con verifica email (scrypt + token firmati con `crypto`), partite, matchmaking ±100, Glicko-2
- `client/` React + TypeScript (Vite): scacchiera, bot, istruttore, revisione, lezioni, gioco online
- Stockfish gira nel browser in WebAssembly (pacchetto npm `stockfish`)
