// /api/mail — send the personal roadmap by email (kept from the original server, now on the shared mail service).
// Legacy paths /api/send-otp, /api/verify-otp and /api/send-plan are aliased in index.js for the old frontend.
import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { requireEmail } from '../utils/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { sendMail, roadmapTemplate, mailStatus } from '../services/mail.service.js';

export const mailRouter = Router();

mailRouter.get('/status', (_req, res) => res.json(mailStatus()));

export const sendPlanHandler = asyncHandler(async (req, res) => {
    const to = requireEmail(req.body?.toEmail);
    const recipientName = (req.body?.studentName || 'Ученик').toString().slice(0, 80);
    const score = Number(req.body?.readinessScore) || 0;
    const matchedUnis = Array.isArray(req.body?.matchedUnis) ? req.body.matchedUnis : [];
    const roadmap = Array.isArray(req.body?.roadmap) ? req.body.roadmap : [];

    const result = await sendMail({
      to,
      subject: `Индивидуальная маршрутная карта поступления — ${recipientName}`,
      html: roadmapTemplate({ recipientName, score, matchedUnis, roadmap }),
      text: `Маршрутная карта UniRoute для ${recipientName}. Индекс готовности ${score}%.`,
    });

    if (!result.delivered) {
      return res.status(503).json({ success: false, delivered: false, error: `Почта не отправлена: ${result.reason}`, code: 'MAIL_UNAVAILABLE' });
    }
    res.json({ success: true, delivered: true, service: 'Google SMTP', messageId: result.messageId, recipient: to, timestamp: new Date().toISOString() });
});

mailRouter.post('/send-plan', authLimiter, sendPlanHandler);
