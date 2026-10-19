import { useEffect, useState } from "react"; import { useNavigate } from "react-router-dom"; import { api, useAuth } from "../api"; import Gate from "../components/Gate";
interface G { id: number; bot_id: string | null; control: string; result: string; played_at: string }
export default function Profile() {
  const { me } = useAuth(); const nav = useNavigate(); const [games, setGames] = useState<G[]>([]);
  useEffect(() => { if (me) api("/games").then(setGames).catch(() => {}); }, [me]);
  if (!me) return <Gate />;
  const open = async (id: number) => nav("/review", { state: { pgn: (await api("/games/" + id)).pgn } });
  return (<><h1>{me.username}</h1><p className="lead">{me.is_guest ? "Account ospite: crea un account per le partite classificate." : "Il tuo profilo e le tue partite."}</p>
    <div className="cards">{me.ratings.map((r) => <div className="card" key={r.control}><small>{r.control}</small><b>{Math.round(r.rating)}</b><small>{r.games} partite</small></div>)}</div>
    <h2 style={{ marginTop: 28 }}>Le tue partite</h2>
    <div className="panel list">{games.length === 0 && <p className="lead">Nessuna partita ancora: gioca contro un bot o online.</p>}
      {games.map((g) => <div key={g.id} className="item" role="button" tabIndex={0} onClick={() => open(g.id)} onKeyDown={(e) => e.key === "Enter" && open(g.id)}>
        <span>{new Date(g.played_at).toLocaleDateString("it-IT")}</span><span>{g.bot_id ? `vs ${g.bot_id}` : "Online " + g.control}</span><b style={{ marginLeft: "auto" }}>{g.result}</b><small>Analizza</small></div>)}</div></>);
}
