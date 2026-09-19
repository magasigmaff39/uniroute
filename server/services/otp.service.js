// One-time codes for email verification. Codes are hashed at rest; 5 wrong attempts invalidate the code.
// If SMTP is unavailable and dev mode is on, the code is returned in the API response so verification
// still works end-to-end on a laptop without Gmail credentials.
import crypto from 'node:crypto';
import { getStore, nowIso } from '../db/store.js';
import { config } from '../config.js';
import { badRequest } from '../utils/errors.js';
import { sendMail, otpTemplate, isMailConfigured } from './mail.service.js';

const MAX_ATTEMPTS = 5;
const hashCode = (email, code) => crypto.createHash('sha256').update(`${email}:${code}`).digest('hex');
const otpId = (email) => crypto.createHash('sha1').update(String(email).toLowerCase()).digest('hex');

export async function issueOtp(email, name) {
  email = String(email).toLowerCase();
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + config.otp.ttlMinutes * 60_000).toISOString();

  const store = await getStore();
  await store.set('otp_codes', otpId(email), { email, codeHash: hashCode(email, code), expiresAt, attempts: 0, createdAt: nowIso() });

  const mail = await sendMail({
    to: email,
    subject: `Код подтверждения UniRoute: ${code}`,
    html: otpTemplate(name || 'Ученик', code, config.otp.ttlMinutes),
    text: `Ваш код подтверждения UniRoute: ${code}. Действует ${config.otp.ttlMinutes} минут.`,
  });

  const response = {
    success: true,
    delivered: mail.delivered,
    recipient: email,
    expiresAt,
    ttlMinutes: config.otp.ttlMinutes,
    message: mail.delivered ? `6-значный код отправлен на ${email}` : 'Почтовый сервис недоступен — используйте код из режима разработки',
  };

  if (!mail.delivered) {
    console.log(`[otp] ${isMailConfigured() ? 'SMTP ошибка' : 'SMTP не настроен'} → dev-код для ${email}: ${code}`);
    if (config.otp.devMode) response.devCode = code;
    else response.error = mail.reason;
  }
  return response;
}

export async function verifyOtp(email, code) {
  email = String(email).toLowerCase();
  const cleanCode = String(code || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) throw badRequest('Код должен состоять из 6 цифр', 'OTP_FORMAT');

  const store = await getStore();
  const id = otpId(email);
  const row = await store.get('otp_codes', id);
  if (!row) throw badRequest('Код не найден или устарел. Запросите новый код.', 'OTP_MISSING');
  if (row.expiresAt < nowIso()) {
    await store.remove('otp_codes', id);
    throw badRequest(`Срок действия кода истёк (${config.otp.ttlMinutes} минут). Запросите код повторно.`, 'OTP_EXPIRED');
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await store.remove('otp_codes', id);
    throw badRequest('Слишком много неверных попыток. Запросите новый код.', 'OTP_LOCKED');
  }

  const ok = crypto.timingSafeEqual(Buffer.from(row.codeHash, 'hex'), Buffer.from(hashCode(email, cleanCode), 'hex'));
  if (!ok) {
    await store.update('otp_codes', id, { attempts: row.attempts + 1 });
    throw badRequest(`Неверный код. Осталось попыток: ${MAX_ATTEMPTS - row.attempts - 1}`, 'OTP_INVALID');
  }

  await store.remove('otp_codes', id);
  return { success: true, verified: true, email };
}
