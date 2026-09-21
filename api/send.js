// Vercel serverless function — sends a branded internal notification
// and a branded confirmation email using Resend.
//
// Setup required in the Vercel project (Settings → Environment Variables):
//   RESEND_API_KEY   = your Resend API key
// And in Resend: verify the ninotechy.com sending domain so mail can be
// sent from an @ninotechy.com address instead of Resend's shared domain.

const BRAND = '#cf4519';
const BRAND_LIGHT = '#ff8144';

function field(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #262029;color:#8f8a98;font-family:'Courier New',monospace;font-size:12px;letter-spacing:.05em;width:150px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-top:1px solid #262029;color:#f4f2ee;font-family:Arial,sans-serif;font-size:14px;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function emailShell(innerHtml, preheader) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050409;">
  <span style="display:none;font-size:1px;color:#050409;">${escapeHtml(preheader || '')}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050409;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d0b12;border:1px solid #262029;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 36px 0;">
            <div style="font-family:Arial,sans-serif;font-weight:bold;font-size:18px;color:#f4f2ee;letter-spacing:.02em;">
              NINO <span style="color:${BRAND_LIGHT};">TECHY</span>
            </div>
            <div style="height:1px;background:linear-gradient(90deg, ${BRAND}, transparent);margin-top:20px;"></div>
          </td>
        </tr>
        <tr><td style="padding:28px 36px 36px;">${innerHtml}</td></tr>
        <tr>
          <td style="padding:20px 36px 32px;border-top:1px solid #262029;">
            <div style="font-family:Arial,sans-serif;font-size:12px;color:#8f8a98;">
              Nino Techy · <a href="https://ninotechy.com" style="color:${BRAND_LIGHT};text-decoration:none;">ninotechy.com</a> · +974 5113 1080
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderInternalEmail(d) {
  const rows = [
    field('NAME', d.name),
    field('EMAIL', d.email),
    field('PHONE', d.phone),
    field('COMPANY', d.company),
    field('CONTACT VIA', d.contactPref),
    field('MISSION TYPE', d.projectType),
    field('INDUSTRY', d.industry),
    field('DESCRIPTION', d.description),
    field('BUDGET', d.budget),
    field('TIMELINE', d.timeline),
    field('BRAND ASSETS', d.assets),
    field('REFERENCES', d.references),
    field('HEARD VIA', d.heard),
  ].join('');

  const inner = `
    <div style="font-family:'Courier New',monospace;color:${BRAND_LIGHT};font-size:12px;letter-spacing:.1em;margin-bottom:6px;">NEW MISSION BRIEFING</div>
    <div style="font-family:Arial,sans-serif;font-size:22px;color:#f4f2ee;font-weight:bold;margin-bottom:20px;">
      ${escapeHtml(d.name || 'Unknown')}${d.company ? ' — ' + escapeHtml(d.company) : ''}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  `;
  return emailShell(inner, `New mission briefing from ${d.name || 'a visitor'}`);
}

function renderConfirmEmail(d) {
  const inner = `
    <div style="font-family:'Courier New',monospace;color:${BRAND_LIGHT};font-size:12px;letter-spacing:.1em;margin-bottom:14px;">TRANSMISSION RECEIVED</div>
    <div style="font-family:Arial,sans-serif;font-size:22px;color:#f4f2ee;font-weight:bold;margin-bottom:16px;">
      Thanks${d.name ? ', ' + escapeHtml(d.name) : ''} — your mission is logged.
    </div>
    <p style="font-family:Arial,sans-serif;font-size:15px;color:#a39dab;line-height:1.7;margin:0 0 20px;">
      We read every briefing personally. Expect a reply within 48 hours with a clear first step —
      no generic sales pitch, just what we'd actually do.
    </p>
    <div style="background:#141019;border:1px solid #262029;border-radius:10px;padding:18px 20px;margin-bottom:8px;">
      <div style="font-family:'Courier New',monospace;font-size:11px;color:#8f8a98;letter-spacing:.08em;margin-bottom:6px;">WHAT YOU TOLD US</div>
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#f4f2ee;">${escapeHtml(d.projectType || 'Your project')}${d.industry ? ' · ' + escapeHtml(d.industry) : ''}</div>
    </div>
  `;
  return emailShell(inner, 'Your mission briefing has been received');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service is not configured yet.' });
  }

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { data = {}; }
  }
  data = data || {};

  if (!data.name || !data.email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const sendEmail = (payload) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    const internalSend = sendEmail({
      from: 'Nino Techy Missions <missions@ninotechy.com>',
      to: ['hello@ninotechy.com'],
      reply_to: data.email,
      subject: `New Mission Briefing — ${data.name}${data.company ? ' / ' + data.company : ''}`,
      html: renderInternalEmail(data),
    });

    const confirmSend = sendEmail({
      from: 'Nino Techy <hello@ninotechy.com>',
      to: [data.email],
      subject: 'Transmission received — your mission is logged',
      html: renderConfirmEmail(data),
    });

    await Promise.all([internalSend, confirmSend]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send email.' });
  }
}
