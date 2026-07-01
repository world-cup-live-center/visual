// Resend ile onay kodu e-postasi gonderir.
// RESEND_API_KEY yoksa kodu konsola yazar (yerel gelistirme icin pratik fallback).
const { Resend } = require("resend");

const apiKey = process.env.RESEND_API_KEY || "";
const from = process.env.MAIL_FROM || "MoS Rhythm <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

function codeEmailHtml(code) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0a0a0f;padding:32px;color:#f2f2f7">
    <div style="max-width:440px;margin:0 auto;background:#14141c;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#fff">MoS Rhythm</h1>
      <p style="margin:0 0 24px;color:#9a9aa5">Hesabini dogrulamak icin asagidaki kodu gir:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#ff2d3f;text-align:center;padding:18px;background:rgba(255,45,63,.08);border-radius:12px">${code}</div>
      <p style="margin:24px 0 0;color:#6c6c78;font-size:13px">Bu kod 15 dakika gecerlidir. Bu istegi sen yapmadiysan e-postayi yok sayabilirsin.</p>
    </div>
  </div>`;
}

function resetEmailHtml(code) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0a0a0f;padding:32px;color:#f2f2f7">
    <div style="max-width:440px;margin:0 auto;background:#14141c;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#fff">MoS Rhythm</h1>
      <p style="margin:0 0 24px;color:#9a9aa5">Sifreni sifirlamak icin asagidaki kodu gir:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#ff2d3f;text-align:center;padding:18px;background:rgba(255,45,63,.08);border-radius:12px">${code}</div>
      <p style="margin:24px 0 0;color:#6c6c78;font-size:13px">Bu kod 15 dakika gecerlidir. Sifreni sifirlamak istemediysen bu e-postayi yok say.</p>
    </div>
  </div>`;
}

async function sendResetCode(email, code) {
  if (!resend) {
    console.log(`[mailer] RESEND_API_KEY yok — ${email} icin sifre sifirlama kodu: ${code}`);
    return { delivered: false, devCode: code };
  }
  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: `MoS Rhythm sifre sifirlama kodun: ${code}`,
      html: resetEmailHtml(code)
    });
    if (result && result.error) {
      console.error("[mailer] Resend reddetti:", result.error.message || result.error);
      console.log(`[mailer] ${email} icin sifre sifirlama kodu (fallback): ${code}`);
      return { delivered: false };
    }
    return { delivered: true };
  } catch (error) {
    console.error("[mailer] sifirlama e-postasi gonderilemedi:", error.message);
    console.log(`[mailer] ${email} icin sifre sifirlama kodu (fallback): ${code}`);
    return { delivered: false };
  }
}

async function sendVerificationCode(email, code) {
  if (!resend) {
    console.log(`[mailer] RESEND_API_KEY yok — ${email} icin dogrulama kodu: ${code}`);
    return { delivered: false, devCode: code };
  }
  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: `MoS Rhythm dogrulama kodun: ${code}`,
      html: codeEmailHtml(code)
    });
    // Resend hata objesi dondurebilir (throw etmeden). Onu da yakala.
    if (result && result.error) {
      console.error("[mailer] Resend reddetti:", result.error.message || result.error);
      console.log(`[mailer] ${email} icin dogrulama kodu (fallback): ${code}`);
      return { delivered: false };
    }
    return { delivered: true };
  } catch (error) {
    // Mail gonderilemese bile kaydi bozma: kodu logla, delivered:false don.
    console.error("[mailer] e-posta gonderilemedi:", error.message);
    console.log(`[mailer] ${email} icin dogrulama kodu (fallback): ${code}`);
    return { delivered: false };
  }
}

module.exports = { sendVerificationCode, sendResetCode };
