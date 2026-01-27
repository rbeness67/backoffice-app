import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },

  // ✅ anti "pending forever"
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

export async function sendZipLinkEmail(params: {
  to: string;
  subject: string;
  monthTitle: string;
  downloadUrl: string;
}) {
  const from = process.env.MAIL_FROM!;
  if (!from) throw new Error("Missing MAIL_FROM env var");

  await mailer.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text:
      `Voici le lien de téléchargement pour les factures du mois de ${params.monthTitle}:\n` +
      `${params.downloadUrl}\n\n` +
      `Ce lien est temporaire.`,
    html:
      `<p>Voici le lien de téléchargement pour les factures du mois de <b>${params.monthTitle}</b> :</p>` +
      `<p><a href="${params.downloadUrl}">Télécharger le ZIP</a></p>` +
      `<p><i>Ce lien est temporaire.</i></p>`,
  });
}
