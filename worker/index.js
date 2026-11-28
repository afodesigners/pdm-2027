/* Cloudflare Worker: serves the static site and handles POST /api/contact.
   The contact form is emailed through the Resend API (https://resend.com).
   Required secret: RESEND_API_KEY. Vars (wrangler.jsonc): CONTACT_TO, CONTACT_FROM. */

const MAX_BODY = 10 * 1024;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

async function contact(request, env, url) {
  if (request.method !== 'POST') return json({ ok: false }, 405, { Allow: 'POST' });

  const origin = request.headers.get('Origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch {}
    if (host !== url.host) return json({ ok: false }, 403);
  }

  if (Number(request.headers.get('Content-Length')) > MAX_BODY) return json({ ok: false }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false }, 413);

  let data;
  try { data = JSON.parse(raw); } catch { return json({ ok: false }, 400); }
  if (!data || typeof data !== 'object') return json({ ok: false }, 400);

  const str = (v) => (v == null ? '' : String(v)).trim();
  const plans = str(data.plans), message = str(data.message);
  const name = str(data.name).replace(/[\r\n]+/g, ' ').trim();
  const email = str(data.email).replace(/[\r\n]+/g, '').trim();

  if (str(data.company)) return json({ ok: true }); // honeypot: pretend success, send nothing

  if (!name || name.length > 100 || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || plans.length > 200 || message.length > 5000) {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return json({ ok: false }, 500);
  }

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Championship / racing plans: ${plans || '-'}`,
    '',
    'Message:',
    message || '-',
    '',
    'Sent from the contact form on pdmedia.co.uk',
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: email,
        subject: `PDM 2027 enquiry: ${name}`,
        text,
      }),
    });
    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      return json({ ok: false }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error('Resend request failed', err);
    return json({ ok: false }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return contact(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
