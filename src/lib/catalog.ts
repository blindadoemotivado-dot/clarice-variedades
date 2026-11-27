import type { AffiliateProduct, ProductCategory, Marketplace } from '@/types/product';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (value: number): string => brl.format(value);

export function extractMlbId(url: string): string | null {
  const m = url.match(/MLB-?(\d{6,12})/i);
  return m ? `MLB-${m[1]}` : null;
}

export function isValidShopeeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    (trimmed.includes('shopee.com.br') || trimmed.includes('s.shopee.com.br') || trimmed.includes('shp.ee'))
  );
}

export function buildWhatsAppCopy(p: AffiliateProduct): string {
  const isShopee = p.marketplace === 'shopee';
  const channel = isShopee ? 'SHOPEE' : 'MERCADO LIVRE';
  const destination = isShopee ? 'na Shopee' : 'no Mercado Livre';
  return `🔥 *ACHADINHO ${channel} • CLARICE ACHADINHOS*\n\n🛍️ *${p.title}*\n~De: ${formatBRL(p.originalPrice)}~\n✅ *Por apenas: ${formatBRL(p.currentPrice)}* (${p.discountPercent}% OFF)\n💳 ${p.installmentsText}\n\n👉 *Compre ${destination} pelo link oficial:* ${p.affiliateUrl}\n\n📲 *Participe do nosso Grupo VIP no WhatsApp:* https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o`;
}

export type SortKey = 'relevance' | 'price' | 'discount';
export type CategoryFilter = ProductCategory | 'Relâmpago';
export type MarketplaceFilter = 'todos' | Marketplace;

export interface FilterOptions {
  query: string;
  category: CategoryFilter;
  favoritesOnly: boolean;
  favorites: string[];
  sort: SortKey;
  marketplaceFilter?: MarketplaceFilter;
}

export function filterProducts(list: AffiliateProduct[], o: FilterOptions): AffiliateProduct[] {
  const q = o.query.trim().toLowerCase();
  const out = list.filter((p) => {
    if (q && !p.title.toLowerCase().includes(q) && !p.mlbId.toLowerCase().includes(q)) return false;
    if (o.favoritesOnly && !o.favorites.includes(p.id)) return false;
    if (o.category === 'Relâmpago') return p.badgeText === 'Oferta Relâmpago';
    if (o.marketplaceFilter && o.marketplaceFilter !== 'todos') {
      const pMarket = p.marketplace || 'mercadolivre';
      if (pMarket !== o.marketplaceFilter) return false;
    }
    return o.category === 'Todos' || p.category === o.category;
  });
  if (o.sort === 'price') return [...out].sort((a, b) => a.currentPrice - b.currentPrice);
  if (o.sort === 'discount') return [...out].sort((a, b) => b.discountPercent - a.discountPercent);
  return [...out].sort((a, b) => Number(b.featured) - Number(a.featured));
}

const SIM_IMAGES = ['1585386959984-a4155224a1ad', '1556228453-efd6c1ff04f6', '1572635196237-14b3f281503f', '1523275335684-37898b6baf30'];

/** Simula a extração de dados do ML a partir de uma URL (determinística pelo código MLB). */
export function productFromUrl(url: string, category: AffiliateProduct['category'], affiliateUrl?: string, optimizeTitle = false): AffiliateProduct | null {
  const clean = url.trim();
  if (!clean) return null;
  const mlbId = extractMlbId(clean) ?? `MLB-${String(Math.abs(hash(clean))).slice(0, 7).padStart(7, '0')}`;
  const n = Number(mlbId.replace(/\D/g, ''));
  const slug = clean.split('/').find((s) => /[a-z]-[a-z]/i.test(s) && !/MLB/i.test(s));
  const base = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : `Produto ${category} ${mlbId}`;
  const originalPrice = 100 + (n % 900) + 0.9;
  const discountPercent = 15 + (n % 35);
  return {
    id: `${mlbId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    mlbId,
    title: optimizeTitle ? `${base} | Original com Garantia e Envio Rápido` : base,
    originalPrice,
    currentPrice: Math.round(originalPrice * (100 - discountPercent)) / 100,
    discountPercent,
    installmentsText: `em ${3 + (n % 8)}x sem juros`,
    imageUrl: `https://images.unsplash.com/photo-${SIM_IMAGES[n % SIM_IMAGES.length]}?auto=format&fit=crop&w=600&q=80`,
    affiliateUrl: affiliateUrl?.trim() || clean,
    category,
    freeShipping: true,
    isFull: n % 2 === 0,
    rating: 4.5,
    reviewsCount: 0,
    featured: false,
  };
}

function hash(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

/**
 * Normaliza títulos removendo acentos, pontuação e termos genéricos de promoção
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(oferta|ofertas|promocao|promocoes|original|novo|nova|super|barato|imperdivel|frete|gratis|lancamento|top)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula a similaridade entre duas strings (0 a 1) combinando Dice Bigrams e Token Jaccard
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const tokens1 = new Set(str1.split(' ').filter(Boolean));
  const tokens2 = new Set(str2.split(' ').filter(Boolean));
  let tokenIntersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) tokenIntersection++;
  }
  const totalTokens = tokens1.size + tokens2.size;
  const tokenSimilarity = totalTokens > 0 ? (2 * tokenIntersection) / totalTokens : 0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < str1.length - 1; i++) {
    const bigram = str1.slice(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < str2.length - 1; i++) {
    const bigram = str2.slice(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  const totalBigrams = str1.length - 1 + (str2.length - 1);
  const bigramSimilarity = totalBigrams > 0 ? (2 * intersection) / totalBigrams : 0;

  return Math.max(bigramSimilarity, tokenSimilarity);
}

/**
 * Normaliza URL de imagem do Mercado Livre para detecção de duplicados
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim().split('?')[0].split('#')[0];
  const match = clean.match(/D_NQ_NP_(?:2X_)?([a-zA-Z0-9_-]+)/i);
  if (match) {
    return match[1].replace(/[-_][OVF]$/i, '').toLowerCase();
  }
  return clean.toLowerCase();
}

/**
 * Deduplicação inteligente de produtos para a vitrine e importação:
 * Elimina produtos duplicados com base em:
 * 1. Mesmo ID externo normalizado (MLB-... ou SHP-...)
 * 2. Mesma URL de imagem normalizada (mesmo asset do Mercado Livre / Shopee)
 * 3. Título normalizado idêntico ou similaridade >= 85% com preços idênticos ou próximos
 */
export function deduplicateProducts<
  T extends {
    id?: string;
    mlbId?: string;
    imageUrl?: string;
    title?: string;
    currentPrice?: number;
  }
>(items: T[]): T[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  const seenImages = new Set<string>();
  const seenMlbs = new Set<string>();
  const seenTitles = new Map<string, number>();
  const result: T[] = [];

  for (const item of items) {
    const rawImg = item.imageUrl?.trim() || '';
    const normImg = normalizeImageUrl(rawImg);
    const rawMlb = (item.mlbId || '').trim().toUpperCase();
    const isRealMlb =
      rawMlb.length > 5 &&
      !rawMlb.startsWith('MLB-HASH') &&
      !rawMlb.startsWith('SHP-HASH');
    const normTitle = normalizeTitle(item.title || '');
    const price = Math.round(Number(item.currentPrice || 0));

    let isDupe = false;

    // 1. Mesmo MLB/Shopee ID real
    if (isRealMlb && seenMlbs.has(rawMlb)) {
      isDupe = true;
    }

    // 2. Mesma imagem normalizada
    if (!isDupe && normImg && normImg.length > 5 && seenImages.has(normImg)) {
      isDupe = true;
    }

    // 3. Título normalizado equivalente (alta similaridade ou mesmas palavras-chave iniciais com preço similar)
    if (!isDupe && normTitle.length >= 10) {
      for (const [existingTitle, existingPrice] of seenTitles.entries()) {
        const sim = calculateSimilarity(normTitle, existingTitle);
        const wordsA = normTitle.split(' ').slice(0, 4).join(' ');
        const wordsB = existingTitle.split(' ').slice(0, 4).join(' ');
        const priceDiff = Math.abs(price - existingPrice);

        if (
          sim >= 0.85 ||
          (wordsA.length >= 8 && wordsA === wordsB && priceDiff <= 5)
        ) {
          isDupe = true;
          break;
        }
      }
    }

    if (!isDupe) {
      if (isRealMlb) seenMlbs.add(rawMlb);
      if (normImg && normImg.length > 5) seenImages.add(normImg);
      if (normTitle.length >= 10) seenTitles.set(normTitle, price);
      result.push(item);
    }
  }

  return result;
}

