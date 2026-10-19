import { Link } from "react-router-dom";
export default function Gate() { return (<div className="panel auth"><h2>Accedi per continuare</h2><p className="lead">Puoi anche entrare come ospite in un click.</p><Link className="btn" to="/login">Vai all'accesso</Link></div>); }
