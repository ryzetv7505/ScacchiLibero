import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import PlayBot from "./pages/PlayBot"; import Review from "./pages/Review"; import Lessons from "./pages/Lessons"; import Online from "./pages/Online"; import Login from "./pages/Login"; import Profile from "./pages/Profile";
import { AuthProvider, useAuth } from "./api"; import { t } from "./i18n";
function Shell() {
  const { me, logout } = useAuth();
  return (<BrowserRouter>
    <header className="top"><div className="logo"><i>♞</i>{t.app}</div>
      <nav className="nav"><NavLink to="/" end>{t.play}</NavLink><NavLink to="/online">{t.online}</NavLink><NavLink to="/review">{t.review}</NavLink><NavLink to="/lessons">{t.lessons}</NavLink></nav>
      <div className="userbox">{me ? <><NavLink to="/profilo">{me.username}</NavLink><button className="chip" onClick={logout}>Esci</button></> : <NavLink className="btn" to="/login">Accedi</NavLink>}</div></header>
    <main className="page"><Routes><Route path="/" element={<PlayBot />} /><Route path="/online" element={<Online />} /><Route path="/review" element={<Review />} /><Route path="/lessons" element={<Lessons />} />
      <Route path="/login" element={<Login />} /><Route path="/profilo" element={<Profile />} /></Routes></main>
  </BrowserRouter>);
}
export default function App() { return <AuthProvider><Shell /></AuthProvider>; }
