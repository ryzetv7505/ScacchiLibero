import { useEffect, useState, FormEvent } from "react"; import { useNavigate, useSearchParams } from "react-router-dom"; import { api, useAuth } from "../api";
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const [sp] = useSearchParams(); const [reg, setReg] = useState(false);
  const [f, setF] = useState({ username: "", email: "", password: "" }); const [err, setErr] = useState(""), [info, setInfo] = useState(""), [dev, setDev] = useState(""), [unver, setUnver] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { const v = sp.get("verified"); if (v === "1") setInfo("Email verificata! Ora puoi accedere."); if (v === "0") setErr("Link non valido o scaduto: reinvia l'email di verifica."); }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const run = async (fn: () => Promise<void>) => { setErr(""); setInfo(""); setDev(""); setBusy(true); try { await fn(); } catch (e) { setErr((e as Error).message); setUnver((e as { code?: string }).code === "unverified"); } setBusy(false); };
  const submit = (e: FormEvent) => { e.preventDefault(); run(async () => {
    if (reg) { const r = await api("/auth/register", { body: f }); setInfo(`Ti abbiamo scritto a ${f.email}: apri il link per attivare l'account.`); setDev(r.devLink ?? ""); setUnver(true); }
    else { const r = await api("/auth/login", { body: { email: f.email, password: f.password } }); await login(r.token); nav("/online"); } }); };
  const resend = () => run(async () => { const r = await api("/auth/resend", { body: { email: f.email } }); setInfo("Se l'account esiste, ti abbiamo inviato una nuova email."); setDev(r.devLink ?? ""); });
  const guest = () => run(async () => { const r = await api("/auth/guest", { body: {} }); await login(r.token); nav("/online"); });
  return (<form className="panel auth" onSubmit={submit}>
    <h1>{reg ? "Crea il tuo account" : "Bentornato"}</h1>
    {reg && <label className="field">Nome utente<input value={f.username} onChange={set("username")} minLength={3} maxLength={20} autoComplete="username" required /></label>}
    <label className="field">Email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></label>
    <label className="field">Password (almeno 8 caratteri)<input type="password" value={f.password} onChange={set("password")} minLength={8} autoComplete={reg ? "new-password" : "current-password"} required /></label>
    {err && <div className="err" role="alert">{err}</div>}{info && <div className="fb ok" role="status">{info}</div>}
    {dev && <div className="fb">Modalità sviluppo (email non configurata): <a href={dev} style={{ textDecoration: "underline" }}>conferma qui</a></div>}
    <button className="btn" disabled={busy}>{reg ? "Registrati" : "Accedi"}</button>
    {unver && f.email && <button type="button" className="btn ghost" disabled={busy} onClick={resend}>Reinvia email di verifica</button>}
    <button type="button" className="btn ghost" onClick={() => { setReg(!reg); setErr(""); setInfo(""); }}>{reg ? "Ho già un account" : "Non ho un account"}</button>
    <button type="button" className="btn ghost" disabled={busy} onClick={guest}>Gioca come ospite</button>
  </form>);
}
