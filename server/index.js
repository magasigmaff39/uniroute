// UniRoute AI backend — standalone Node server (development and non-Firebase hosting).
// Run with `npm run dev:server` (or `npm run dev` for client + server together).
import app from './app.js';
import { config, ROOT_DIR } from './config.js';
import { getStore, runMaintenance } from './db/store.js';
import { verifyMailTransport } from './services/mail.service.js';
import { discoverModels } from './services/groq.client.js';
import { isGeminiConfigured } from './services/gemini.client.js';
import { UNIVERSITY_COUNTS } from '../shared/data/universities/index.js';
import { OLYMPIAD_COUNTS } from '../shared/data/olympiads.js';

async function start() {
  const store = await getStore();
  await Promise.all([verifyMailTransport(), discoverModels()]);
  runMaintenance().catch(() => {});
  setInterval(() => runMaintenance().catch(() => {}), 15 * 60_000).unref();

  app.listen(config.port, config.host, () => {
    console.log(`\nUniRoute AI backend → http://${config.host}:${config.port}`);
    console.log(`База: ${UNIVERSITY_COUNTS.total} учебных заведений (${UNIVERSITY_COUNTS.universities} вузов, ${UNIVERSITY_COUNTS.colleges} колледжей, ${UNIVERSITY_COUNTS.schools} школ; KZ ${UNIVERSITY_COUNTS.kazakhstan}, USA/CA ${UNIVERSITY_COUNTS.usa_canada}, EU ${UNIVERSITY_COUNTS.europe}, Asia ${UNIVERSITY_COUNTS.asia}), ${OLYMPIAD_COUNTS.total} олимпиад и конкурсов`);
    console.log(`Хранилище: ${store.driver}${store.driver === 'sqlite' ? ` (${config.db.file})` : ''}; файлы: ${config.files.driver}`);
    console.log(`AI: ${isGeminiConfigured() ? 'Gemini ✓' : 'Gemini ✗'} · ${config.ai.apiKey ? 'Groq ✓ (fallback)' : 'Groq ✗'} · Google-вход: ${config.firebase.googleSignIn && config.firebase.projectId ? config.firebase.projectId : 'выключен'}`);
    console.log(`Корень проекта: ${ROOT_DIR}\n`);
  });
}

start().catch((err) => {
  console.error('Не удалось запустить сервер:', err);
  process.exit(1);
});
