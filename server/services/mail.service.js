// Outbound email through Gmail SMTP (nodemailer). Falls back gracefully when SMTP is not configured:
// callers receive `{ delivered: false, reason }` instead of an exception so the UX can degrade cleanly.
import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;
let verified = null; // null = not checked yet, true/false afterwards

export function isMailConfigured() {
  return Boolean(config.smtp.user && config.smtp.pass);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    const isGmail = config.smtp.host === 'smtp.gmail.com';
    const transportOptions = isGmail
      ? {
          service: 'gmail',
          auth: { user: config.smtp.user, pass: config.smtp.pass },
          connectionTimeout: 15_000,
        }
      : {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: { user: config.smtp.user, pass: config.smtp.pass },
          connectionTimeout: 15_000,
          greetingTimeout: 15_000,
          socketTimeout: 25_000,
        };
    transporter = nodemailer.createTransport(transportOptions);
  }
  return transporter;
}

/** Verify SMTP credentials once at startup (non-fatal). */
export async function verifyMailTransport() {
  const t = getTransporter();
  if (!t) {
    verified = false;
    console.log('[mail] SMTP не настроен (GMAIL_USER / GMAIL_APP_PASSWORD пустые) — письма не отправляются, OTP в dev-режиме');
    return false;
  }
  try {
    await t.verify();
    verified = true;
    console.log(`[mail] SMTP готов: ${config.smtp.host}:${config.smtp.port} как ${config.smtp.user}`);
  } catch (err) {
    verified = false;
    console.warn(`[mail] SMTP недоступен (${err.message}) — переключаюсь на dev-режим OTP`);
  }
  return verified;
}

export function mailStatus() {
  return { configured: isMailConfigured(), verified: verified === true, user: isMailConfigured() ? config.smtp.user : null };
}

/**
 * @returns {Promise<{delivered: boolean, messageId?: string, reason?: string}>}
 */
export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) return { delivered: false, reason: 'SMTP не настроен' };
  try {
    const info = await t.sendMail({ from: `"${config.smtp.from}" <${config.smtp.user}>`, to, subject, html, text });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`[mail] Ошибка отправки на ${to}: ${err.message}`);
    return { delivered: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const shell = (title, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background:#09090b;color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#000;border:1px solid #27272a;border-radius:20px;padding:36px;">
    <div style="font-size:20px;font-weight:900;letter-spacing:2px;margin-bottom:24px;border-bottom:1px solid #18181b;padding-bottom:20px;">UNIROUTE AI
      <span style="font-size:11px;color:#a1a1aa;font-weight:500;margin-left:8px;">• НАВИГАТОР ПОСТУПЛЕНИЯ</span></div>
    <h1 style="font-size:18px;font-weight:700;margin:0 0 14px;">${title}</h1>
    ${body}
    <div style="font-size:11px;color:#52525b;border-top:1px solid #18181b;padding-top:20px;margin-top:28px;">UniRoute AI © 2026 • Индивидуальная стратегия поступления</div>
  </div></body></html>`;

export function otpTemplate(name, code, ttlMinutes) {
  return shell(
    'Подтверждение регистрации',
    `<p style="font-size:14px;line-height:1.6;color:#a1a1aa;">Здравствуйте, <strong style="color:#fff;">${escapeHtml(name)}</strong>!<br>Ваш 6-значный код для создания аккаунта UniRoute AI:</p>
     <div style="background:#09090b;border:1px solid #3f3f46;border-radius:14px;padding:24px;text-align:center;margin:26px 0;">
       <div style="font-size:38px;font-weight:800;letter-spacing:10px;font-family:Courier New,monospace;">${code}</div></div>
     <p style="font-size:12px;color:#71717a;">Срок действия кода — <strong>${ttlMinutes} минут</strong>.</p>`,
  );
}

export function roadmapTemplate({ recipientName, score, matchedUnis = [], roadmap = [] }) {
  const unis = matchedUnis
    .slice(0, 4)
    .map(
      (u) => `<div style="border-bottom:1px solid #27272a;padding:12px 0;">
        <strong style="font-size:13px;">${escapeHtml(u.name)}</strong> <span style="color:#a1a1aa;">(${escapeHtml(u.city)}, ${escapeHtml(u.country)})</span><br>
        <span style="font-size:11px;color:#10b981;font-weight:600;">${u.hasFullGrantOrScholarship ? 'Доступно 100% финансирование' : 'Платное обучение / частичные стипендии'}</span><br>
        <span style="font-size:11px;color:#a1a1aa;">Дедлайн: ${escapeHtml(u.regularDeadline)} • IELTS ${u.minIelts}+</span></div>`,
    )
    .join('');
  const steps = roadmap
    .slice(0, 5)
    .map((s) => `<div style="padding:6px 0;border-bottom:1px solid #27272a;font-size:12px;color:#a1a1aa;"><strong style="color:#fff;">${escapeHtml(s.title)}</strong> — ${escapeHtml(s.targetDate)}</div>`)
    .join('');
  return shell(
    `Маршрутная карта: ${escapeHtml(recipientName)}`,
    `<p style="font-size:13px;color:#a1a1aa;">Индекс готовности: <strong style="color:#fff;">${score}%</strong></p>
     <div style="background:#121216;border:1px solid #27272a;border-radius:12px;padding:16px;margin-bottom:16px;"><h3 style="margin:0 0 8px;font-size:14px;">🏛️ Рекомендованные университеты</h3>${unis}</div>
     <div style="background:#121216;border:1px solid #27272a;border-radius:12px;padding:16px;"><h3 style="margin:0 0 8px;font-size:14px;">📅 Контрольные этапы</h3>${steps}</div>`,
  );
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
