const CATALOG_NOISE = 'CjB4IZYLbGb1hBDIEvNfUJUdmLPRuE0S9DUwEItYd6PUrhOpKvEJ7m';
const CATALOG_API = 'https://api-catalog.zalo.me';
const PAGE_SIZE = 20;

function parsePrice(value, fallback = 0) {
  if (typeof value === 'number' && value > 0) return value;
  if (!value || typeof value !== 'string') return fallback;
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : fallback;
}

function inferCategory(name = '') {
  const normalized = name.toLowerCase();
  if (/(api|tool|bot|grok|elevenlabs|higgsfield)/.test(normalized)) return 'Tool & AI';
  if (/(code|source|react|template)/.test(normalized)) return 'Code & Template';
  if (/(adobe|canva|youtube|duolingo|notion|microsoft|capcut)/.test(normalized)) return 'Tài khoản';
  return 'Phần mềm';
}

function inferBadge(priceText = '', index = 0) {
  if (/hết|ngưng/i.test(priceText)) return 'Tạm dừng';
  return ['Đã xác thực', 'Đáng tin cậy', 'Hàng nội bộ'][index % 3];
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'user-agent': 'patrick-tech-store-bot/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'patrick-tech-store-bot/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractMetaContent(html, property) {
  if (!html) return '';
  const safeProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${safeProperty}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${safeProperty}["']`, 'i')
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return '';
}

async function fetchCatalogPage(lastId = 0) {
  const url = `${CATALOG_API}/v1/catalog?noise=${encodeURIComponent(CATALOG_NOISE)}&limit=${PAGE_SIZE}&lastId=${lastId}`;
  return fetchJson(url);
}

function productPid(path) {
  if (!path) return '';
  const query = path.includes('?') ? path.slice(path.indexOf('?') + 1) : path;
  return new URLSearchParams(query).get('pid') || '';
}

async function fetchProductDetail(productPath) {
  const pid = productPid(productPath);
  if (!pid) return null;
  const url = `${CATALOG_API}/v1/product?productId=${encodeURIComponent(pid)}`;
  return fetchJson(url);
}

async function fetchProductMeta(path) {
  if (!path) return {};

  try {
    const url = path.startsWith('http') ? path : `https://catalog.zalo.me/${path.replace(/^\/?/, '')}`;
    const html = await fetchText(url);

    return {
      title: extractMetaContent(html, 'og:title'),
      description: extractMetaContent(html, 'og:description'),
      image: extractMetaContent(html, 'og:image')
    };
  } catch {
    return {};
  }
}

async function mapWithConcurrency(items, mapper, concurrency = 5) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function getCatalogProducts() {
  const collected = [];
  const seenIds = new Set();
  let lastId = 0;
  let total = Infinity;

  while (collected.length < total) {
    const page = await fetchCatalogPage(lastId);
    const payload = page?.data;
    const rows = payload?.category_product ?? [];
    total = payload?.total ?? rows.length;

    if (!rows.length) break;

    for (const row of rows) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        collected.push(row);
      }
    }

    const ids = rows.map((row) => row.id).filter(Boolean);
    const nextLastId = ids.length ? Math.min(...ids) : 0;

    if (!nextLastId || nextLastId === lastId) break;
    lastId = nextLastId;
  }

  const details = await mapWithConcurrency(collected, async (product, index) => {
    const [detailResponse, meta] = await Promise.all([
      fetchProductDetail(product.path).catch(() => null),
      fetchProductMeta(product.path).catch(() => ({}))
    ]);

    const info = detailResponse?.data?.product_info ?? {};
    const priceValue = parsePrice(product.strPrice, product.price);
    const catalogDescription = info.description || meta.description || '';

    return {
      id: product.id,
      title: meta.title || product.name,
      category: inferCategory(product.name),
      price: priceValue,
      priceText: product.strPrice || (priceValue ? `${priceValue.toLocaleString('vi-VN')}đ` : 'Liên hệ'),
      image: product.photos?.[0] || meta.image || 'https://stc-zh5.zdn.vn/catalog/thumb-fail.png',
      images: info.productPhotos || product.photos || [],
      badge: inferBadge(product.strPrice, index),
      path: `https://catalog.zalo.me/${product.path}`,
      source: 'zalo-catalog',
      sellerName: info.ownerDisplayName || 'Patrick Tech Media',
      sellerAvatar: info.ownerAvatarUrl || '',
      description: catalogDescription,
      rawPrice: product.price,
      syncedAt: new Date().toISOString()
    };
  });

  return {
    source: 'https://catalog.zalo.me/',
    catalogName: 'Tất cả sản phẩm',
    total: details.length,
    syncedAt: new Date().toISOString(),
    products: details
  };
}


