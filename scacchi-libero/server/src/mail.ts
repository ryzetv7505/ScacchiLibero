import nodemailer from "nodemailer";
const prod = process.env.NODE_ENV === "production";
const tx = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
// Ritorna il link solo in sviluppo senza SMTP (così puoi provare senza server di posta).
export async function sendVerification(to: string, link: string): Promise<string | undefined> {
  if (tx) {
    await tx.sendMail({ from: process.env.MAIL_FROM ?? "ScacchiLibero <no-reply@localhost>", to, subject: "Conferma la tua email su ScacchiLibero",
      text: `Ciao! Conferma la tua email aprendo questo link (valido 24 ore):\n${link}`,
      html: `<p>Ciao! Conferma la tua email per iniziare a giocare:</p><p><a href="${link}">Conferma email</a></p><p>Il link vale 24 ore.</p>` });
    return undefined;
  }
  console.log(`\n[Email non configurata] Link di verifica per ${to}:\n${link}\n`);
  return prod ? undefined : link;
}
