import it from "./it.json";
const dict: Record<string, typeof it> = { it }; // aggiungi en.json, de.json… per altre lingue
export const t = dict[(navigator.language || "it").slice(0, 2)] ?? it;
