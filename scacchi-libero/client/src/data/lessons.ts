export interface Step { fen: string; prompt: string; solution: string[]; explain: string }
export interface Lesson { id: string; title: string; level: "principiante" | "aperture" | "mediogioco" | "finali"; steps: Step[] }
// Posizioni di esempio: da sostituire/ampliare con posizioni reali da partite storiche.
export const LESSONS: Lesson[] = [
  { id: "matto-in-1", title: "Dare scacco matto in una mossa", level: "principiante", steps: [
    { fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", prompt: "Il Bianco muove: trova il matto del corridoio.", solution: ["Ra8#"], explain: "Il Re nero è chiuso dai suoi pedoni: la Torre dà scacco sull'ottava traversa e non c'è fuga." },
    { fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", prompt: "Trova il matto del pastore.", solution: ["Qxf7#"], explain: "Donna e Alfiere attaccano f7, difeso solo dal Re: è matto." } ] },
  { id: "opposizione", title: "Finale di pedone: l'opposizione", level: "finali", steps: [
    { fen: "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1", prompt: "Come avanzi con il Re?", solution: ["Kd3", "Kf3"], explain: "Il Re guida il pedone: prendi l'opposizione per vincere la casa di promozione." } ] },
];
