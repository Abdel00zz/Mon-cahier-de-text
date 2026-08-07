interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

interface SendEmailBody {
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

const MAX_SUBJECT_LENGTH = 180;
const MAX_BODY_LENGTH = 120_000;

const normalizeRecipients = (value: unknown, fallback?: string): string[] => {
  const raw = Array.isArray(value) ? value : value ? [value] : fallback ? [fallback] : [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 10);
};

const trimText = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

const getBody = (body: unknown): SendEmailBody => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as SendEmailBody;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as SendEmailBody;
  return {};
};

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const fallbackTo = process.env.RESEND_DEFAULT_TO_EMAIL;

  if (!apiKey || !from) {
    return res.status(500).json({
      error: 'Resend n est pas configure. Ajoutez RESEND_API_KEY et RESEND_FROM_EMAIL sur Vercel.',
    });
  }

  const body = getBody(req.body);
  const to = normalizeRecipients(body.to, fallbackTo);
  const subject = trimText(body.subject, MAX_SUBJECT_LENGTH);
  const text = trimText(body.text, MAX_BODY_LENGTH);
  const html = trimText(body.html, MAX_BODY_LENGTH);
  const replyTo = trimText(body.replyTo, 320);

  if (to.length === 0) {
    return res.status(400).json({ error: 'Aucun destinataire email valide.' });
  }

  if (!subject) {
    return res.status(400).json({ error: 'Sujet email manquant.' });
  }

  if (!text && !html) {
    return res.status(400).json({ error: 'Contenu email manquant.' });
  }

  const resendPayload: Record<string, unknown> = {
    from,
    to,
    subject,
  };

  if (text) resendPayload.text = text;
  if (html) resendPayload.html = html;
  if (replyTo) resendPayload.reply_to = replyTo;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  });

  const result = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    return res.status(resendResponse.status).json({
      error: 'Resend a refuse l envoi.',
      details: result,
    });
  }

  return res.status(200).json({
    ok: true,
    id: typeof result?.id === 'string' ? result.id : undefined,
  });
}
