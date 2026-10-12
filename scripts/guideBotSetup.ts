/**
 * Points the owner's bot at this site, so it can take the /code command.
 *
 *   npm run guide:bot:setup
 *
 * Run once after deploying, and again whenever the site's address changes.
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL
 * from .env.local — the secret must match the deployment's.
 *
 * Sending notifications is not affected: a webhook only decides where the
 * messages people write *to* the bot are delivered.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

async function call(method: string, params: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = (await res.json()) as { ok: boolean; description?: string };
  if (!body.ok) throw new Error(`${method}: ${body.description}`);
  return body;
}

async function run() {
  const missing = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'NEXT_PUBLIC_SITE_URL'].filter(
    (key) => !process.env[key]
  );
  if (missing.length) throw new Error(`Missing in .env.local: ${missing.join(', ')}`);

  const raw = process.env.NEXT_PUBLIC_SITE_URL!.trim();
  const site = (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, '');
  if (!site.startsWith('https://')) throw new Error('Telegram only calls https:// webhooks');
  const url = `${site}/api/telegram/guide`;

  await call('setWebhook', {
    url,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    max_connections: 1,
    drop_pending_updates: true,
  });
  await call('setMyCommands', {
    commands: [
      { command: 'code', description: 'Сменить код' },
      { command: 'codes', description: 'Действующие коды' },
      { command: 'help', description: 'Помощь' },
    ],
  });
  console.log(`Webhook set: ${url}`);
  if (!process.env.TELEGRAM_ALLOWED_USERS) {
    console.log('TELEGRAM_ALLOWED_USERS is empty: write to the bot to learn your id, then set it.');
  }
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
