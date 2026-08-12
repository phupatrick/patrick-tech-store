import { useEffect, useMemo, useState } from 'react';

const ZALO_LINK = 'https://zalo.me/0933684560';
const TELEGRAM_LINK = 'https://t.me/Patrick_Tech_Fullapp';

const fallbackProducts = [
  { id: 1, title: 'Windows 11 Pro - Key bản quyền', category: 'Voucher giảm giá & Tài khoản', price: 890000, priceText: '890.000đ', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=85', badge: 'Sản phẩm của web', sourceType: 'web', description: 'Key bản quyền chính hãng, kích hoạt nhanh và có hỗ trợ cài đặt từ xa.' },
  { id: 2, title: 'Canva Pro - Gói 12 tháng', category: 'Voucher giảm giá & Tài khoản', price: 299000, priceText: '299.000đ', image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=85', badge: 'Sản phẩm của web', sourceType: 'web', description: 'Tài khoản dùng ổn định, phù hợp cho thiết kế, social và dựng nội dung.' },
  { id: 3, title: 'Voucher giảm giá AI Premium', category: 'Voucher giảm giá & Tài khoản', price: 1490000, priceText: '1.490.000đ', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85', badge: 'Sản phẩm của web', sourceType: 'web', description: 'Voucher hỗ trợ giảm chi phí khi mua các gói công cụ AI và phần mềm số.' },
  { id: 4, title: 'Landing Page React + Tailwind', category: 'Voucher giảm giá & Tài khoản', price: 2200000, priceText: '2.200.000đ', image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=85', badge: 'Sản phẩm của web', sourceType: 'web', description: 'Mẫu code tối ưu mobile, sạch và dễ chỉnh sửa để dùng ngay cho bán hàng.' },
];

const initialRequests = [
  { initials: 'AN', title: 'Tìm tài khoản Adobe Creative Cloud', detail: 'Ưu tiên gói 1 năm, có hướng dẫn kích hoạt.', budget: 'Dưới 900.000đ', time: '12 phút trước' },
  { initials: 'MT', title: 'Cần source code shop React', detail: 'Có quản lý đơn hàng, giao diện mobile tốt.', budget: '1 - 3 triệu', time: '1 giờ trước' },
  { initials: 'DN', title: 'Tìm tool quản lý social media', detail: 'Cần dùng được nhiều tài khoản, hỗ trợ Windows.', budget: 'Trao đổi', time: '2 giờ trước' },
];

const pageTabs = {
  vi: [
    { id: 'store', label: 'Sản phẩm của web' },
    { id: 'buyer', label: 'Người mua' },
    { id: 'seller', label: 'Người bán' },
  ],
  en: [
    { id: 'store', label: 'Store products' },
    { id: 'buyer', label: 'Buyers' },
    { id: 'seller', label: 'Sellers' },
  ]
};

const hashtags = ['#chatgpt', '#youtubepremium', '#canva', '#duolingo', '#adobe', '#capcut', '#notion', '#grok', '#office365', '#spotify', '#netflix', '#figma'];
const categories = {
  vi: ['Voucher giảm giá', 'Tài khoản', 'Phần mềm', 'AI', 'Office', 'Streaming', 'Thiết kế', 'Giáo dục', 'Cloud', 'Code', 'Template'],
  en: ['Discount vouchers', 'Accounts', 'Software', 'AI', 'Office', 'Streaming', 'Design', 'Education', 'Cloud', 'Code', 'Templates'],
};

const copy = {
  vi: {
    language: 'English',
    visitSite: 'Sang patricktechmedia.com',
    login: 'Đăng nhập',
    heroTitle: 'Mua công cụ đúng.',
    heroAccent: 'Làm việc nhanh hơn.',
    heroText: 'Kho sản phẩm số đã xác thực, có sẵn link hỗ trợ qua Zalo và Telegram khi bạn cần mua nhanh.',
    sell: 'Trang người bán',
    wanted: 'Trang người mua',
    search: 'Tìm voucher giảm giá, tài khoản hoặc phần mềm số...',
    find: 'Tìm kiếm',
    categories: 'Danh mục',
    featured: 'Sản phẩm của web',
    viewAll: 'Xem tất cả',
    services: 'Người bán',
    servicesTitle: 'Dành cho người đăng bán sản phẩm số.',
    servicesText: 'Đăng sản phẩm, được kiểm duyệt trước khi hiển thị và áp dụng phí nền tảng rõ ràng.',
    request: 'Người mua',
    requestTitle: 'Đăng nhu cầu như một bài trạng thái.',
    fee: 'Phí nền tảng',
    verified: 'Đã xác thực',
    digital: 'Tài nguyên số',
    delivery: 'Giao online',
    feeText: '1% giá trị đơn hàng, tối thiểu 0.50 USD.',
    close: 'Đóng',
    listing: 'Đăng sản phẩm',
    productName: 'Tên sản phẩm',
    productPlaceholder: 'Ví dụ: Key Windows 11 Pro',
    price: 'Giá bán (VND)',
    submit: 'Gửi bài đăng',
    requested: 'Tìm sản phẩm',
    requestIntro: 'Cho cộng đồng biết chính xác bạn đang cần gì.',
    requestName: 'Sản phẩm bạn muốn tìm',
    detail: 'Mô tả chi tiết',
    budget: 'Ngân sách',
    postRequest: 'Đăng nhu cầu',
    created: 'Bài đăng đã được gửi và đang chờ duyệt.',
    requestCreated: 'Nhu cầu tìm mua đã được đăng.',
    noResult: 'Chưa tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác.',
    loadingProducts: 'Đang tải kho sản phẩm...',
    catalogError: 'Chưa tải được dữ liệu mới nhất, đang hiển thị dữ liệu dự phòng.',
    footer: 'Nơi giao dịch tài nguyên số gọn gàng, minh bạch.',
    saved: 'sản phẩm đã lưu',
    requestNow: 'Vừa xong',
    buyNow: 'Mua ngay',
    viewDescription: '\u004d\u00f4 t\u1ea3',
    priceLabel: 'Gi\u00e1',
    sellerLabel: 'Ng\u01b0\u1eddi b\u00e1n',
    catalogLink: 'Xem tr\u00ean catalog',
    noDescription: 'Catalog ch\u01b0a c\u00f3 m\u00f4 t\u1ea3 chi ti\u1ebft cho s\u1ea3n ph\u1ea9m n\u00e0y.',
    contactTitle: 'Chọn cách liên hệ để mua sản phẩm',
    zalo: 'Zalo 0933684560',
    telegram: 'Telegram @Patrick_Tech_Fullapp',
    storeNoteTitle: 'Sản phẩm của web',
    storeNoteText: 'Trang này hiển thị riêng các sản phẩm của web, gồm voucher giảm giá và tài khoản số.',
    sellerNoteTitle: 'Trang người bán',
    sellerNoteText: 'Đây là khu đăng bán sản phẩm số, có kiểm duyệt và tính phí nền tảng tự động.',
    buyerNoteTitle: 'Trang người mua',
    buyerNoteText: 'Người mua có thể đăng nhu cầu như một status ngắn để người bán phù hợp vào tư vấn nhanh.',
    contactSeller: 'Liên hệ',
  },
  en: {
    language: 'Tiếng Việt',
    visitSite: 'Go to patricktechmedia.com',
    login: 'Login',
    heroTitle: 'Buy better tools.',
    heroAccent: 'Work faster.',
    heroText: 'A verified catalog of digital products with quick Zalo and Telegram contact when you want to buy fast.',
    sell: 'Seller page',
    wanted: 'Buyer page',
    search: 'Search discounts, accounts, or digital software...',
    find: 'Search',
    categories: 'Categories',
    featured: 'Store products',
    viewAll: 'View all',
    services: 'Sellers',
    servicesTitle: 'For people listing digital products.',
    servicesText: 'List a product, pass review before going live, and keep fees clear.',
    request: 'Buyers',
    requestTitle: 'Post what you want to buy like a status update.',
    fee: 'Platform fee',
    verified: 'Verified',
    digital: 'Digital goods',
    delivery: 'Online delivery',
    feeText: '1% of the order value, with a $0.50 minimum.',
    close: 'Close',
    listing: 'List a product',
    productName: 'Product name',
    productPlaceholder: 'Example: Windows 11 Pro key',
    price: 'Price (USD)',
    submit: 'Submit listing',
    requested: 'Find a product',
    requestIntro: 'Tell the community exactly what you are looking for.',
    requestName: 'Product you need',
    detail: 'Details',
    budget: 'Budget',
    postRequest: 'Post request',
    created: 'Your listing has been submitted for review.',
    requestCreated: 'Your wanted request is now live.',
    noResult: 'No matching products yet. Try a different keyword.',
    loadingProducts: 'Loading products...',
    catalogError: 'Latest data is unavailable, showing backup products.',
    footer: 'A clear marketplace for digital resources.',
    saved: 'saved products',
    requestNow: 'Just now',
    buyNow: 'Buy now',
    viewDescription: 'Description',
    priceLabel: 'Price',
    sellerLabel: 'Seller',
    catalogLink: 'View on catalog',
    noDescription: 'This product does not have a detailed catalog description yet.',
    contactTitle: 'Choose a contact method to buy this product',
    zalo: 'Zalo 0933684560',
    telegram: 'Telegram @Patrick_Tech_Fullapp',
    storeNoteTitle: 'Store products',
    storeNoteText: 'This page shows only store-owned products, including discount vouchers and digital accounts.',
    sellerNoteTitle: 'Seller page',
    sellerNoteText: 'This area is for listing digital products with review and automatic platform fees.',
    buyerNoteTitle: 'Buyer page',
    buyerNoteText: 'Buyers can post short status-style requests so the right seller can contact them faster.',
    contactSeller: 'Contact',
  }
};

const VND_PER_USD = 26000;

// Catalog descriptions are authored in Vietnamese. Translate complete support
// sentences before individual terms so English product details remain readable.
const englishCatalogPhrases = [
  [/📦\s*Định dạng:\s*Link Ưu Đãi/gi, '📦 Format: Discount link'],
  [/⚠️\s*Lưu ý:/gi, '⚠️ Notes:'],
  [/Sản phẩm này không bảo hành\s*,?\s*dán link lên là nhận được Plan\.?/gi, 'This product has no warranty. Paste the link to receive the plan.'],
  [/Link nhận Plan Gemini AI Pro hạn\s*(\d+)\s*months?\.?/gi, 'Gemini AI Pro plan link valid for $1 months.'],
  [/Không cần thêm thẻ\s*,?\s*không cần sử dụng vpn\.?/gi, 'No card needs to be added and no VPN is required.'],
  [/Mua về chỉ cần login gmail\s*→\s*dán link\s*→\s*activation Plan\.?/gi, 'After purchase, sign in to Gmail, paste the link, and activate the plan.'],
  [/Bảo hành 24 giờ mua về sử dụng liền không bảo hành những trường hợp ngâm link quá 24h kể từ lúc mua\.?/gi, 'The link is covered for 24 hours after purchase. Links left unused for more than 24 hours are not covered.'],
  [/SẢN PHẨM NÀY KHÔNG BẢO HÀNH NẾU BỊ MẤT PLAN HOẶC BAN ACC, VÌ KHÔNG PHẢI ADD FAM MÀ LÀ NÂNG CẤP TRỰC TIẾP TRÊN ACC NÊN CÓ NGUY CƠ BỊ BAN ACC/gi, 'THIS PRODUCT IS NOT COVERED IF THE PLAN IS LOST OR THE ACCOUNT IS BANNED. IT IS A DIRECT ACCOUNT UPGRADE, NOT A FAMILY-PLAN ADDITION, SO ACCOUNT-BAN RISK MAY APPLY.'],
];

const englishTerms = [
  [/không bảo hành/gi, 'no warranty'],
  [/bảo hành/gi, 'warranty'],
  [/link ưu đãi/gi, 'discount link'],
  [/định dạng/gi, 'Format'],
  [/lưu ý/gi, 'Notes'],
  [/người dùng/gi, 'user'],
  [/người mua/gi, 'buyer'],
  [/sử dụng/gi, 'use'],
  [/không cần/gi, 'not required'],
  [/mua về/gi, 'after purchase'],
  [/mất plan/gi, 'lose the plan'],
  [/ban acc/gi, 'account ban'],
  [/nâng gói/gi, 'Upgrade'],
  [/tài khoản/gi, 'Account'],
  [/bản quyền/gi, 'License'],
  [/gói/gi, 'Plan'],
  [/giảm giá/gi, 'Discount'],
  [/phần mềm/gi, 'Software'],
  [/tháng/gi, 'months'],
  [/năm/gi, 'year'],
  [/liên hệ/gi, 'Contact us'],
  [/kích hoạt/gi, 'activation'],
  [/hỗ trợ/gi, 'support'],
  [/trọn đời/gi, 'lifetime'],
  [/chính hãng/gi, 'official'],
];

function translateCatalogText(text, language) {
  if (!text || language === 'vi') return text;
  const translatedPhrases = englishCatalogPhrases.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
  return englishTerms.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), translatedPhrases);
}

function localizedCategory(language) {
  return language === 'en' ? 'Discount vouchers & accounts' : 'Voucher giảm giá & Tài khoản';
}

const formatPrice = (value, fallbackText, language) => {
  if (typeof value === 'number' && value > 0) {
    if (language === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value / VND_PER_USD);
    }
    return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
  }
  if (language === 'en') return 'Contact us';
  return fallbackText || 'Liên hệ';
};

const feeFor = (value) => Math.max((value / 25000) * 0.01, 0.5);

function normalizeDescription(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isDescriptionNoise(text, priceText = '') {
  if (!text) return true;
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedPrice = (priceText || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return true;
  if (normalized === 'liên hệ' || normalized === 'lien he') return true;
  if (normalizedPrice && normalized === normalizedPrice) return true;
  return false;
}

function normalizeProduct(product) {
  const cleanedDescription = normalizeDescription(product.description);
  return {
    ...product,
    category: 'Voucher giảm giá & Tài khoản',
    image: product.image || product.images?.[0] || 'https://stc-zh5.zdn.vn/catalog/thumb-fail.png',
    badge: 'Sản phẩm của web',
    description: isDescriptionNoise(cleanedDescription, product.priceText) ? '' : cleanedDescription,
    sourceType: product.source === 'zalo-catalog' ? 'catalog' : 'web'
  };
}

function renderCatalogInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function CatalogDescription({ text }) {
  return (
    <div className="catalog-description">
      {text.split(/\r?\n/).map((line, index) => {
        const value = line.trim();

        if (!value) return <div className="catalog-description-spacer" key={index} />;
        if (/^-{3,}$/.test(value)) return <hr key={index} />;
        if (/^#{1,3}\s+/.test(value)) {
          return <h3 key={index}>{renderCatalogInline(value.replace(/^#{1,3}\s+/, ''))}</h3>;
        }
        if (/^\*\s+/.test(value)) {
          return <p className="catalog-description-bullet" key={index}>{renderCatalogInline(value.replace(/^\*\s+/, ''))}</p>;
        }

        return <p key={index}>{renderCatalogInline(value)}</p>;
      })}
    </div>
  );
}
function Logo() {
  return (
    <a className="logo" href="https://patricktechmedia.com" target="_blank" rel="noreferrer" aria-label="patricktechmedia.com">
      <img src="https://patricktechmedia.com/patrick-tech-media-icon.svg?v=39177d1409a5053bff72af89" alt="Patrick Tech Media" />
      <span>Patrick Tech Store</span>
    </a>
  );
}

function ProductCard({ product, language, onSave, onBuy, onViewDescription, buyLabel, descriptionLabel }) {
  const [saved, setSaved] = useState(false);

  const toggleSave = () => {
    setSaved((current) => !current);
    onSave(!saved);
  };

  return (
    <article className="product-card">
      <div className="product-visual">
        <img src={product.image} alt={translateCatalogText(product.title, language)} loading="lazy" />
        <span className="badge verified-badge"><span className="badge-check">✓</span>{language === 'en' ? 'Store product' : product.badge}</span>
        <button className={saved ? 'save-button is-saved' : 'save-button'} aria-label={language === 'en' ? 'Save product' : 'Lưu sản phẩm'} onClick={toggleSave}>♡</button>
      </div>
      <div className="product-info">
        <p>{localizedCategory(language)}</p>
        <h3>{translateCatalogText(product.title, language)}</h3>
        <strong>{formatPrice(product.price, product.priceText, language)}</strong>
        <div className="product-actions-row">
          <button className="description-button" aria-label={descriptionLabel} title={descriptionLabel} onClick={() => onViewDescription(product)}>{descriptionLabel}</button>
          <button className="buy-button" onClick={() => onBuy(product)}>{buyLabel}</button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [language, setLanguage] = useState('vi');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [sellPrice, setSellPrice] = useState('5000000');
  const [requests, setRequests] = useState(initialRequests);
  const [saved, setSaved] = useState(0);
    const [products, setProducts] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activePage, setActivePage] = useState('store');
  const [translatedCatalog, setTranslatedCatalog] = useState({});
  const [translatedTitles, setTranslatedTitles] = useState({});

  const t = copy[language];
  const tabs = pageTabs[language];
  const localizedProducts = useMemo(() => products.map((product) => ({
    ...product,
    title: language === 'en'
      ? (translatedTitles[String(product.id || product.path || product.title)] || translateCatalogText(product.title, language))
      : product.title,
    category: localizedCategory(language),
  })), [products, language, translatedTitles]);
  const priceInput = Number(sellPrice.replace(/\D/g, '')) || 0;
  const pageNote = activePage === 'seller'
    ? { title: t.sellerNoteTitle, text: t.sellerNoteText }
    : activePage === 'buyer'
      ? { title: t.buyerNoteTitle, text: t.buyerNoteText }
      : { title: t.storeNoteTitle, text: t.storeNoteText };

  const filteredProducts = useMemo(
    () => localizedProducts.filter((product) => `${product.title} ${product.category} ${product.description || ''}`.toLowerCase().includes(query.toLowerCase())),
    [localizedProducts, query]
  );

  useEffect(() => {
    if (language !== 'en' || !products.length) return;
    const untranslated = products.filter((product) => !translatedTitles[String(product.id || product.path || product.title)]);
    if (!untranslated.length) return;

    let active = true;
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: untranslated.map((product) => product.title) }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('title translation unavailable'))))
      .then((data) => {
        if (!active || !Array.isArray(data.translations)) return;
        setTranslatedTitles((current) => ({
          ...current,
          ...Object.fromEntries(untranslated.map((product, index) => [
            String(product.id || product.path || product.title),
            data.translations[index] || translateCatalogText(product.title, 'en'),
          ])),
        }));
      });

    return () => { active = false; };
  }, [language, products, translatedTitles]);

  useEffect(() => {
    if (language !== 'en' || !selectedProduct?.description) return;
    const productKey = String(selectedProduct.id || selectedProduct.path || selectedProduct.title);
    if (translatedCatalog[productKey]) return;

    let active = true;
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selectedProduct.description }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('translation unavailable'))))
      .then((data) => {
        if (active && data.translated) {
          setTranslatedCatalog((current) => ({ ...current, [productKey]: data.translated }));
        }
      })
      .catch(() => {
        if (active) setTranslatedCatalog((current) => ({ ...current, [productKey]: translateCatalogText(selectedProduct.description, 'en') }));
      });

    return () => { active = false; };
  }, [language, selectedProduct, translatedCatalog]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const submitListing = (event) => {
    event.preventDefault();
    setModal(null);
    showNotice(t.created);
  };

  const submitRequest = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setRequests((current) => [
      { initials: 'PT', title: form.get('title'), detail: form.get('detail'), budget: form.get('budget'), time: t.requestNow },
      ...current,
    ]);
    setModal(null);
    showNotice(t.requestCreated);
  };

  const openBuyModal = (product) => {
    setSelectedProduct(product);
    setModal('contact');
  };

  const openDescriptionModal = (product) => {
    setSelectedProduct(product);
    setModal('description');
  };

  const selectPage = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('catalog api failed');
        const data = await response.json();
        if (active && Array.isArray(data.products) && data.products.length) {
          setProducts(data.products.map((item) => normalizeProduct(item)));
          setCatalogStatus('ready');
        } else if (active) {
          setCatalogStatus('error');
        }
      } catch {
        if (active) {
          setProducts(fallbackProducts.map((item) => normalizeProduct(item)));
          setCatalogStatus('error');
        }
      }
    }

    loadProducts();
    const refreshTimer = window.setInterval(loadProducts, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  return (
    <div id="top">
      <header className="site-header">
        <div className="nav-wrap">
          <Logo />
          <div className="nav-actions">
            <a className="domain-button" href="https://patricktechmedia.com" target="_blank" rel="noreferrer">{t.visitSite}</a>
            <a className="login-button" href={language === 'vi' ? 'https://patricktechmedia.com/vi/login' : 'https://patricktechmedia.com/en/login'} target="_blank" rel="noreferrer">{t.login}</a>
            <button className="language-button" onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}>{t.language}</button>
            
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="section-kicker">patricktechmedia.com</p>
              <h1>{t.heroTitle}<br /><em>{t.heroAccent}</em></h1>
              <p className="hero-description">{t.heroText}</p>
              <div className="hero-actions">
                <button className="button button-secondary-alt" onClick={() => selectPage('seller')}>{t.sell}</button>
                <button className="button button-text" onClick={() => selectPage('buyer')}>{t.wanted}<b>↗</b></button>
              </div>
              <div className="page-note">
                <p className="section-kicker">{pageNote.title}</p>
                <p>{pageNote.text}</p>
              </div>
            </div>
            <div className="hero-media">
              <div className="media-grid"></div>
              <img src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=90" alt="Lập trình trên màn hình máy tính" />
              <div className="hero-status"><span></span><div><b>{t.verified}</b><small>{t.digital}</small></div></div>
              <div className="fee-orb"><span>{t.fee}</span><b>0.50 USD</b></div>
            </div>
          </div>
        </section>

        <section className="search-region" id="explore">
          <div className="page-tabs">
            {tabs.map((tab) => (
              <button key={tab.id} className={activePage === tab.id ? 'switch-pill is-active' : 'switch-pill'} onClick={() => selectPage(tab.id)}>{tab.label}</button>
            ))}
          </div>
          <div className="search-bar">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            <button onClick={() => document.getElementById(activePage === 'store' ? 'products' : activePage === 'seller' ? 'services' : 'wanted')?.scrollIntoView({ behavior: 'smooth' })}>{t.find}</button>
          </div>
          <div className="category-row">
            <span>{t.categories}</span>
            {categories[language].map((category) => <button key={category} onClick={() => setQuery(category)}>{category}</button>)}
            {hashtags.map((tag) => <button key={tag} className="tag-chip" onClick={() => setQuery(tag.replace('#', ''))}>{tag}</button>)}
          </div>
        </section>

        {activePage === 'store' ? (
          <section className="content-section products-section" id="products">
            <div className="section-heading">
              <div><p className="section-kicker">{t.delivery}</p><h2>{t.featured}</h2></div>
              <a href="#products">{t.viewAll} <b>↗</b></a>
            </div>
            {catalogStatus === 'loading' && <p className="catalog-note">{t.loadingProducts}</p>}
            {catalogStatus === 'error' && <p className="catalog-note is-warning">{t.catalogError}</p>}
            <div className="product-grid">
              {filteredProducts.length ? filteredProducts.map((product) => (
                <ProductCard
                  key={product.id || product.title}
                  product={product}
                  language={language}
                  onSave={(wasSaved) => setSaved((count) => count + (wasSaved ? 1 : -1))}
                  onBuy={openBuyModal}
                  onViewDescription={openDescriptionModal}
                  buyLabel={t.buyNow}
                  descriptionLabel={t.viewDescription}
                />
              )) : <p className="empty-state">{t.noResult}</p>}
            </div>
          </section>
        ) : null}

        {activePage === 'seller' ? (
          <section className="seller-section" id="services">
            <div className="seller-intro">
              <p className="section-kicker">{t.services}</p>
              <h2>{t.servicesTitle}</h2>
              <p>{t.servicesText}</p>
              <button className="button button-secondary" onClick={() => setModal('listing')}>{t.sell}<b>↗</b></button>
            </div>
            <div className="seller-points">
              <article><span>01</span><h3>{t.fee}</h3><p>{t.feeText}</p></article>
              <article><span>02</span><h3>{t.verified}</h3><p>{language === 'en' ? 'New listings are checked before they appear on the site.' : 'Những bài đăng mới được kiểm tra trước khi xuất hiện trên trang.'}</p></article>
              <article><span>03</span><h3>{t.delivery}</h3><p>{language === 'en' ? 'Buyers and sellers connect directly and quickly.' : 'Người mua và người bán kết nối trực tiếp, nhanh chóng.'}</p></article>
            </div>
          </section>
        ) : null}

        {activePage === 'buyer' ? (
          <section className="content-section wanted-section" id="wanted">
            <div className="section-heading">
              <div><p className="section-kicker">{t.request}</p><h2>{t.requestTitle}</h2></div>
              <button className="button button-outline" onClick={() => setModal('request')}>+ {t.postRequest}</button>
            </div>
            <div className="request-feed">
              {requests.map((request, index) => (
                <article className="request-card" key={`${request.title}-${index}`}>
                  <div className="request-card-top">
                    <span className="request-avatar">{request.initials}</span>
                    <div className="request-author">
                      <strong>{request.title}</strong>
                      <time>{request.time}</time>
                    </div>
                  </div>
                  <p className="request-detail">{request.detail}</p>
                  <div className="request-meta">
                    <span className="request-budget">{request.budget}</span>
                    <button className="request-contact" aria-label={t.contactSeller}>{t.contactSeller} ↗</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer>
        <Logo />
        <p>{t.footer}</p>
        <span>{saved ? `${saved} ${t.saved}` : '© 2020 patricktechmedia.com'}</span>
      </footer>

      {notice && <div className="toast">{notice}</div>}

      {modal && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t.close} onClick={() => setModal(null)}>×</button>
            {modal === 'listing' ? (
              <form onSubmit={submitListing}>
                <p className="section-kicker">{t.listing}</p>
                <h2>{t.servicesTitle}</h2>
                <label>{t.productName}<input required placeholder={t.productPlaceholder} /></label>
                <label>{t.price}<input required inputMode="numeric" value={sellPrice} onChange={(event) => setSellPrice(event.target.value)} /></label>
                <div className="fee-box"><span>{t.fee}</span><strong>{feeFor(priceInput).toFixed(2)} USD</strong><small>{t.feeText}</small></div>
                <button className="button button-primary button-full" type="submit">{t.submit} <b>↗</b></button>
              </form>
            ) : modal === 'request' ? (
              <form onSubmit={submitRequest}>
                <p className="section-kicker">{t.requested}</p>
                <h2>{t.requestIntro}</h2>
                <label>{t.requestName}<input name="title" required placeholder="Ví dụ: Source code bán hàng React" /></label>
                <label>{t.detail}<input name="detail" required placeholder="Tình trạng, yêu cầu, khu vực..." /></label>
                <label>{t.budget}<input name="budget" required placeholder="Ví dụ: 1 - 2 triệu" /></label>
                <button className="button button-primary button-full" type="submit">{t.postRequest} <b>↗</b></button>
              </form>
            ) : modal === 'description' ? (
              <div className="contact-sheet">
                <p className="section-kicker">{localizedCategory(language)}</p>
                <h2>{t.viewDescription}</h2>
                <div className="product-detail-summary">
                  <img src={selectedProduct?.image} alt="" />
                  <div>
                    <p className="contact-product">{language === 'en' ? (translatedTitles[String(selectedProduct?.id || selectedProduct?.path || selectedProduct?.title)] || translateCatalogText(selectedProduct?.title, 'en')) : selectedProduct?.title}</p>
                    <dl className="detail-list">
                      <div><dt>{t.priceLabel}</dt><dd>{formatPrice(selectedProduct?.price, selectedProduct?.priceText, language)}</dd></div>
                      <div><dt>{t.sellerLabel}</dt><dd>{selectedProduct?.sellerName || 'Patrick Tech Media'}</dd></div>
                    </dl>
                  </div>
                </div>
                <div className="description-sheet">
                  {selectedProduct?.description
                    ? <CatalogDescription text={language === 'en'
                      ? (translatedCatalog[String(selectedProduct.id || selectedProduct.path || selectedProduct.title)] || 'Translating product details...')
                      : selectedProduct.description} />
                    : t.noDescription}
                </div>
                {selectedProduct?.path ? <a className="catalog-link" href={selectedProduct.path} target="_blank" rel="noreferrer">{t.catalogLink}</a> : null}
                <button className="button button-primary button-full" onClick={() => setModal('contact')}>{t.buyNow}</button>
              </div>
            ) : (
              <div className="contact-sheet">
                <p className="section-kicker">{localizedCategory(language)}</p>
                <h2>{t.contactTitle}</h2>
                <p className="contact-product">{language === 'en' ? (translatedTitles[String(selectedProduct?.id || selectedProduct?.path || selectedProduct?.title)] || translateCatalogText(selectedProduct?.title, 'en')) : selectedProduct?.title}</p>
                <div className="contact-links">
                  <a className="button button-primary button-full" href={ZALO_LINK} target="_blank" rel="noreferrer">{t.zalo}</a>
                  <a className="button button-secondary button-full" href={TELEGRAM_LINK} target="_blank" rel="noreferrer">{t.telegram}</a>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}





