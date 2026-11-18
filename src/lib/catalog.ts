import type { AffiliateProduct, ProductCategory } from '@/types/product';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (value: number): string => brl.format(value);

export function extractMlbId(url: string): string | null {
  const m = url.match(/MLB-?(\d{6,12})/i);
  return m ? `MLB-${m[1]}` : null;
}

export function buildWhatsAppCopy(p: AffiliateProduct): string {
  return `🔥 *ACHADINHO CLARICE ACHADINHOS*\n\n🛍️ *${p.title}*\n~De: ${formatBRL(p.originalPrice)}~\n✅ *Por apenas: ${formatBRL(p.currentPrice)}* (${p.discountPercent}% OFF)\n💳 ${p.installmentsText}\n\n👉 *Compre no Mercado Livre pelo link oficial:* ${p.affiliateUrl}`;
}

export type SortKey = 'relevance' | 'price' | 'discount';
export type CategoryFilter = ProductCategory | 'Relâmpago';

export interface FilterOptions { query: string; category: CategoryFilter; favoritesOnly: boolean; favorites: string[]; sort: SortKey }

export function filterProducts(list: AffiliateProduct[], o: FilterOptions): AffiliateProduct[] {
  const q = o.query.trim().toLowerCase();
  const out = list.filter((p) => {
    if (q && !p.title.toLowerCase().includes(q) && !p.mlbId.toLowerCase().includes(q)) return false;
    if (o.favoritesOnly && !o.favorites.includes(p.id)) return false;
    if (o.category === 'Relâmpago') return p.badgeText === 'Oferta Relâmpago';
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
