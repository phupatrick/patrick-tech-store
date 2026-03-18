export const DEFAULT_PRODUCT_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#070b17" />
        <stop offset="100%" stop-color="#334155" />
      </linearGradient>
    </defs>
    <rect width="640" height="420" rx="28" fill="url(#bg)" />
    <text x="44" y="130" fill="#dbeafe" font-family="Segoe UI, sans-serif" font-size="24">Patrick Tech Store</text>
    <text x="44" y="220" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="42" font-weight="700">Anh san pham</text>
    <text x="44" y="268" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="20">Chua tai anh len</text>
  </svg>
`)}`;

export const getProductImageSrc = (image?: string | null) => image?.trim() || DEFAULT_PRODUCT_IMAGE;

export const isInlineImageSrc = (image?: string | null) => getProductImageSrc(image).startsWith("data:");
