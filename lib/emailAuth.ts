import { Resend } from "resend";

// Separate from lib/email.ts on purpose — that one is Gmail/nodemailer and
// specific to internal release notifications. Auth emails are user-facing
// and time-sensitive, so they go through Resend (the domain is already
// verified for mawzrecords.com) instead.
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!apiKey || !domain) {
    console.warn("RESEND_API_KEY / RESEND_EMAIL_DOMAIN no configurados — no se envió el mail de restablecimiento.");
    return { sent: false, reason: "not_configured" as const };
  }

  const resend = new Resend(apiKey);

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 28px; background:#ffffff; color:#111114;">
      <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#8a8a95; margin-bottom:20px;">VPO Corp · Centro de control</div>
      <h1 style="font-size:20px; margin:0 0 14px; font-weight:700;">Restablecer tu contraseña</h1>
      <p style="font-size:14px; line-height:1.6; color:#44444c;">
        Recibimos una solicitud para restablecer la contraseña de la cuenta <strong>${email}</strong>.
        Si fuiste vos, hacé clic en el botón de abajo — el enlace vence en 30 minutos y solo se puede usar una vez.
      </p>
      <a href="${resetUrl}" style="display:inline-block; margin:24px 0; padding:13px 26px; background:#111114; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">
        Restablecer contraseña
      </a>
      <p style="font-size:12px; line-height:1.6; color:#8a8a95;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
        <a href="${resetUrl}" style="color:#44444c; word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="font-size:12px; line-height:1.6; color:#8a8a95; margin-top:20px;">
        Si no pediste este cambio, podés ignorar este correo — tu contraseña actual sigue funcionando.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: `Discográfica <no-reply@${domain}>`,
    to: [email],
    subject: "Restablecer tu contraseña",
    html,
  });

  if (error) {
    console.error("Error enviando mail de restablecimiento:", error);
    return { sent: false, reason: error.message };
  }
  return { sent: true };
}
