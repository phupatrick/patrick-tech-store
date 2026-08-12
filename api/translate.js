const MAX_TEXT_LENGTH = 12000;

const phraseTranslations = [
  [/📦\s*Định dạng:\s*Link Ưu Đãi/gi, '📦 Format: Discount link'],
  [/⚠️\s*Lưu ý:/gi, '⚠️ Notes:'],
  [/Sản phẩm này không bảo hành\s*,?\s*dán link lên là nhận được Plan\.?/gi, 'This product has no warranty. Paste the link to receive the plan.'],
  [/Không cần thêm thẻ\s*,?\s*không cần sử dụng vpn\.?/gi, 'No card needs to be added and no VPN is required.'],
  [/Mua về chỉ cần login gmail\s*→\s*dán link\s*→\s*activation Plan\.?/gi, 'After purchase, sign in to Gmail, paste the link, and activate the plan.'],
  [/Bảo hành 24 giờ mua về sử dụng liền không bảo hành những trường hợp ngâm link quá 24h kể từ lúc mua\.?/gi, 'The link is covered for 24 hours after purchase. Links left unused for more than 24 hours are not covered.'],
  [/SẢN PHẨM NÀY KHÔNG BẢO HÀNH NẾU BỊ MẤT PLAN HOẶC BAN ACC, VÌ KHÔNG PHẢI ADD FAM MÀ LÀ NÂNG CẤP TRỰC TIẾP TRÊN ACC NÊN CÓ NGUY CƠ BỊ BAN ACC/gi, 'THIS PRODUCT IS NOT COVERED IF THE PLAN IS LOST OR THE ACCOUNT IS BANNED. IT IS A DIRECT ACCOUNT UPGRADE, NOT A FAMILY-PLAN ADDITION, SO ACCOUNT-BAN RISK MAY APPLY.'],
];

function translateKnownPhrases(text) {
  return phraseTranslations.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

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
    const preparedText = translateKnownPhrases(text);
    if (!/[\u00c0-\u1ef9]/.test(preparedText)) {
      response.status(200).json({ translated: preparedText });
      return;
    }

    const translationUrl = new URL('https://translate.googleapis.com/translate_a/single');
    translationUrl.searchParams.set('client', 'gtx');
    translationUrl.searchParams.set('sl', 'vi');
    translationUrl.searchParams.set('tl', 'en');
    translationUrl.searchParams.set('dt', 't');
    translationUrl.searchParams.set('q', preparedText);

    const translationResponse = await fetch(translationUrl, { headers: { Accept: 'application/json' } });
    if (!translationResponse.ok) throw new Error(`translation_failed_${translationResponse.status}`);

    const payload = await translationResponse.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((segment) => segment?.[0] || '').join('')
      : '';

    if (!translated || translated.includes('??')) throw new Error('translation_invalid');
    response.status(200).json({ translated });
  } catch (error) {
    response.status(502).json({
      error: 'translation_unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
