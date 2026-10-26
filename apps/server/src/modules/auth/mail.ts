import nodemailer from 'nodemailer';
import { env } from '../../config/env';

// A7: Nodemailer + SMTP genérico. En desarrollo apunta a Mailpit (docker compose, UI en :8025).
const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

interface ResetMail {
  to: string;
  firstName: string;
  username: string;
  link: string;
  ttlMin: number;
}

// Plantilla de la sección 9 de la spec 01: HTML con CSS inline + texto plano.
export async function sendPasswordResetMail({ to, firstName, username, link, ttlMin }: ResetMail) {
  if (env.NODE_ENV !== 'production') {
    console.log(`[mail] link de recuperación para @${username}: ${link}`);
  }
  if (!transport) {
    console.warn('[mail] SMTP_HOST no está configurado: el mail no se envió.');
    return;
  }

  const subject = 'Restablecé tu contraseña de Vision Max';
  const text = [
    `Hola ${firstName},`,
    '',
    `Recibimos un pedido para restablecer la contraseña de tu cuenta (@${username}).`,
    '',
    `Creá una nueva contraseña acá: ${link}`,
    '',
    `El link vence en ${ttlMin} minutos y se puede usar una sola vez.`,
    'Si no fuiste vos, ignorá este mail: tu contraseña no va a cambiar.',
    '',
    '— El equipo de Vision Max',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:32px 16px;background:#121217;font-family:Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#1b1b22;border:1px solid #2e2e38;border-radius:12px;">
    <tr><td style="padding:32px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;">Vision <span style="color:#e9b44c;">Max</span></p>
      <p style="margin:0 0 16px;font-size:16px;">Hola ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#b4b4c0;">Recibimos un pedido para restablecer la contraseña de tu cuenta (@${escapeHtml(username)}).</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#e9b44c;color:#121217;font-weight:600;text-decoration:none;border-radius:8px;">Crear nueva contraseña</a></p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#8a8a96;">El link vence en ${ttlMin} minutos y se puede usar una sola vez.</p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#8a8a96;">Si no fuiste vos, ignorá este mail: tu contraseña no va a cambiar.</p>
      <p style="margin:0;font-size:13px;color:#8a8a96;">— El equipo de Vision Max</p>
    </td></tr>
  </table>
</body></html>`;

  await transport.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
}
