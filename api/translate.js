const MAX_TEXT_LENGTH = 12000;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { text } = request.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    response.status(400).json({ error: 'text_required' });
    return;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    response.status(413).json({ error: 'text_too_long' });
    return;
  }

  try {
    const translationUrl = new URL('https://translate.googleapis.com/translate_a/single');
    translationUrl.searchParams.set('client', 'gtx');
    translationUrl.searchParams.set('sl', 'vi');
    translationUrl.searchParams.set('tl', 'en');
    translationUrl.searchParams.set('dt', 't');
    translationUrl.searchParams.set('q', text);

    const translationResponse = await fetch(translationUrl, { headers: { Accept: 'application/json' } });
    if (!translationResponse.ok) throw new Error(`translation_failed_${translationResponse.status}`);

    const payload = await translationResponse.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((segment) => segment?.[0] || '').join('')
      : '';

    if (!translated) throw new Error('translation_empty');
    response.status(200).json({ translated });
  } catch (error) {
    response.status(502).json({
      error: 'translation_unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
