// Cloudflare Pages Function: POST /api/contact
// Set CONTACT_WEBHOOK_URL (Pages > Settings > Environment variables) to a webhook
// (Slack, Zapier, Make, n8n, a WordPress endpoint, etc.) that receives the JSON below.

interface Env {
  CONTACT_WEBHOOK_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData();

  // Honeypot: bots fill this hidden field
  if (String(form.get('website') || '').trim() !== '') {
    return new Response('ok', { status: 200 });
  }

  const payload = {
    name: String(form.get('name') || '').slice(0, 200),
    email: String(form.get('email') || '').slice(0, 200),
    phone: String(form.get('phone') || '').slice(0, 50),
    topic: String(form.get('topic') || '').slice(0, 50),
    message: String(form.get('message') || '').slice(0, 5000),
    receivedAt: new Date().toISOString(),
  };

  if (!payload.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email) || !payload.message) {
    return new Response('Invalid input', { status: 400 });
  }
  if (!env.CONTACT_WEBHOOK_URL) {
    return new Response('Not configured', { status: 500 });
  }

  const res = await fetch(env.CONTACT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return new Response(res.ok ? 'ok' : 'Upstream error', { status: res.ok ? 200 : 502 });
};
