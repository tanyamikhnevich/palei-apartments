/**
 * Points the florist bot at this site and gives it its command menu.
 *
 *   npm run flowers:bot:setup
 *
 * Run once after deploying, and again whenever the site's address changes.
 * Reads FLOWERS_TELEGRAM_BOT_TOKEN, FLOWERS_TELEGRAM_WEBHOOK_SECRET and
 * NEXT_PUBLIC_SITE_URL from .env.local — the secret must match the deployment.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

async function call(method: string, params: object) {
  const token = process.env.FLOWERS_TELEGRAM_BOT_TOKEN;
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
  const missing = ['FLOWERS_TELEGRAM_BOT_TOKEN', 'FLOWERS_TELEGRAM_WEBHOOK_SECRET', 'NEXT_PUBLIC_SITE_URL'].filter(
    (key) => !process.env[key]
  );
  if (missing.length) throw new Error(`Missing in .env.local: ${missing.join(', ')}`);

  const site = process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/+$/, '');
  if (!site.startsWith('https://')) throw new Error('Telegram only calls https:// webhooks');
  const url = `${site}/api/telegram/flowers`;

  await call('setWebhook', {
    url,
    secret_token: process.env.FLOWERS_TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    // One update at a time: an album's photos then land in order, not on top of each other.
    max_connections: 1,
    drop_pending_updates: true,
  });
  await call('setMyCommands', {
    commands: [
      { command: 'new', description: 'Добавить карточку' },
      { command: 'cancel', description: 'Отменить' },
      { command: 'help', description: 'Помощь' },
    ],
  });
  console.log(`Webhook set: ${url}`);
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
