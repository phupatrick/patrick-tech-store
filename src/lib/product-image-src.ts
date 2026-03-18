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

const REMOTE_IMAGE_PROXY_HOST = "wsrv.nl";
const PROXIED_IMAGE_WIDTH = "960";
const PROXIED_IMAGE_HEIGHT = "720";

export const getProductImageSrc = (image?: string | null) => image?.trim() || DEFAULT_PRODUCT_IMAGE;

export const getRenderableProductImageSrc = (image?: string | null) => {
  const source = getProductImageSrc(image);

  if (!source || source.startsWith("data:") || source.startsWith("/") || source.includes(`${REMOTE_IMAGE_PROXY_HOST}/?url=`)) {
    return source;
  }

  try {
    const url = new URL(source);

    if (!url.hostname.endsWith("zdn.vn")) {
      return source;
    }

    const proxyUrl = new URL(`https://${REMOTE_IMAGE_PROXY_HOST}/`);
    proxyUrl.searchParams.set("url", source);
    proxyUrl.searchParams.set("w", PROXIED_IMAGE_WIDTH);
    proxyUrl.searchParams.set("h", PROXIED_IMAGE_HEIGHT);
    proxyUrl.searchParams.set("fit", "contain");
    proxyUrl.searchParams.set("we", "1");
    proxyUrl.searchParams.set("output", "jpg");
    proxyUrl.searchParams.set("q", "90");

    return proxyUrl.toString();
  } catch {
    return source;
  }
};

export const isInlineImageSrc = (image?: string | null) => getProductImageSrc(image).startsWith("data:");

export const isProxiedProductImageSrc = (image?: string | null) => getProductImageSrc(image).includes(`${REMOTE_IMAGE_PROXY_HOST}/?url=`);
