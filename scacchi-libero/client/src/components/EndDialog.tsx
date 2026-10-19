export default function EndDialog({ title, sub, mate, onReview, onClose, onNew }: { title: string; sub: string; mate?: boolean; onReview: () => void; onClose: () => void; onNew?: () => void }) {
  return (<div className="ov" role="dialog" aria-modal="true" aria-labelledby="endt"><div className="dlg">
    <div className="king" aria-hidden>{mate ? "♚" : "½"}</div><h2 id="endt">{title}</h2><p className="sub">{sub}</p>
    <p>Vuoi la revisione della partita?</p>
    <div className="row" style={{ justifyContent: "center" }}><button className="btn" autoFocus onClick={onReview}>Sì, analizza subito</button><button className="btn ghost" onClick={onClose}>No, grazie</button></div>
    {onNew && <p><button className="chip" onClick={onNew}>Nuova partita</button></p>}</div></div>);
}
