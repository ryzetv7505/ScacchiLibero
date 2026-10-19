import { createContext, createElement, useContext, useEffect, useState, ReactNode } from "react";
export interface Me { id: number; username: string; is_guest: boolean; ratings: { control: string; rating: number; rd: number; games: number }[] }
const K = "sl_token";
export const getToken = () => localStorage.getItem(K);
export async function api(path: string, opts: { method?: string; body?: unknown } = {}) {
  const r = await fetch("/api" + path, { method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error ?? "Errore di rete"), { code: j.code as string | undefined }); return j;
}
const Ctx = createContext<{ me: Me | null; login: (t: string) => Promise<void>; logout: () => void }>(null as never);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const load = async () => { if (!getToken()) return setMe(null); try { setMe(await api("/me")); } catch { localStorage.removeItem(K); setMe(null); } };
  useEffect(() => { load(); }, []);
  return createElement(Ctx.Provider, { value: { me, login: async (t: string) => { localStorage.setItem(K, t); await load(); }, logout: () => { localStorage.removeItem(K); setMe(null); } } }, children);
}
export const beep = () => { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 520; g.gain.value = 0.05; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.06); } catch { /* audio non disponibile */ } };
