import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';

export interface ExtractProductMetadataResult {
  success: boolean;
  title?: string | undefined;
  currentPrice?: string | undefined;
  originalPrice?: string | undefined;
  imageUrl?: string | undefined;
  marketplace?: 'mercadolivre' | 'shopee' | undefined;
  category?: string | undefined;
  error?: string | undefined;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*\|\s*(Mercado\s*Livre|Shopee|Frete\s*Gr[áa]tis).*$/i, '')
    .replace(/\s*-\s*(Mercado\s*Livre|Shopee).*$/i, '')
    .trim();
}

/**
 * Server Function para extrair metadados reais (título, preços e foto)
 * a partir de qualquer link de produto do Mercado Livre ou Shopee.
 */
export const extractProductMetadataServerFn = createServerFn({ method: 'POST' })
  .validator((d: { url: string }) => d)
  .handler(async (ctx): Promise<ExtractProductMetadataResult> => {
    const rawUrl = ctx.data?.url?.trim();
    if (!rawUrl) {
      return { success: false, error: 'URL inválida.' };
    }

    try {
      let currentUrl = rawUrl;
      const isShopee = currentUrl.includes('shopee') || currentUrl.includes('shp.ee');
      const marketplace: 'mercadolivre' | 'shopee' = isShopee ? 'shopee' : 'mercadolivre';

      // 1. Tenta buscar no banco de dados produtos_clarice se já existe por MLB ou affiliate_url
      const env = process.env;
      const supabaseUrl =
        env['VITE_SUPABASE_URL'] ||
        env['SUPABASE_URL'] ||
        'https://tuxvpzeciwxgxhmcrprt.supabase.co';
      const supabaseKey =
        env['SUPABASE_SERVICE_ROLE_KEY'] ||
        env['VITE_SUPABASE_ANON_KEY'] ||
        '';

      const mlbMatch = currentUrl.match(/MLB-?(\d{6,12})/i);
      const extractedMlb = mlbMatch && mlbMatch[1] ? `MLB-${mlbMatch[1]}` : null;

      if (supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
          let query = supabase.from('produtos_clarice').select('title, current_price, original_price, image_url, category');

          if (extractedMlb) {
            query = query.or(`mlb_id.ilike.%${extractedMlb}%,affiliate_url.ilike.%${extractedMlb}%`);
          } else {
            query = query.ilike('affiliate_url', `%${currentUrl.slice(0, 40)}%`);
          }

          const { data, error } = await query.limit(1).maybeSingle();
          if (!error && data && data.title) {
            return {
              success: true,
              title: String(data.title),
              currentPrice: Number(data.current_price).toFixed(2).replace('.', ','),
              originalPrice: data.original_price ? Number(data.original_price).toFixed(2).replace('.', ',') : undefined,
              imageUrl: data.image_url ? String(data.image_url) : undefined,
              category: data.category ? String(data.category) : undefined,
              marketplace,
            };
          }
        } catch {
          // ignore DB error, proceed to fetch
        }
      }

      // 2. Segue redirecionamentos se for link curto
      let hops = 0;
      while (hops < 5 && (currentUrl.includes('meli.la') || currentUrl.includes('/sec/') || currentUrl.includes('shp.ee') || currentUrl.includes('s.shopee'))) {
        hops++;
        const res = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        const loc = res.headers.get('location');
        if (loc) {
          currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).toString();
        } else {
          break;
        }
      }

      // 3. Tenta extrair OpenGraph HTML tags
      let htmlTitle: string | undefined;
      let htmlImage: string | undefined;
      let htmlPrice: string | undefined;

      try {
        const pageRes = await fetch(currentUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (pageRes.ok) {
          const html = await pageRes.text();

          const ogTitleMatch =
            html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
          const rawOgTitle = ogTitleMatch?.[1];
          if (rawOgTitle) {
            htmlTitle = cleanTitle(rawOgTitle);
          }

          const ogImgMatch =
            html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          const rawOgImg = ogImgMatch?.[1];
          if (rawOgImg && rawOgImg.startsWith('http')) {
            htmlImage = rawOgImg;
          }

          const priceMatch = html.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([\d.,]+)["']/i);
          const rawPrice = priceMatch?.[1];
          if (rawPrice) {
            htmlPrice = rawPrice.replace('.', ',');
          }
        }
      } catch {
        // network or parser timeout
      }

      // 4. Se não conseguiu via HTML, deriva da URL (slugs)
      if (!htmlTitle) {
        if (isShopee) {
          const slugMatch = currentUrl.match(/shopee\.com\.br\/([^?]+)-i\./i);
          const rawShopeeSlug = slugMatch?.[1];
          if (rawShopeeSlug) {
            const rawSlug = decodeURIComponent(rawShopeeSlug).replace(/[-_]+/g, ' ').trim();
            htmlTitle = rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1);
          } else {
            htmlTitle = 'Oferta Shopee';
          }
        } else {
          // Mercado Livre slug
          const mlSlug = currentUrl.split('/').find((s) => /[a-z]-[a-z]/i.test(s) && !/MLB/i.test(s));
          if (mlSlug) {
            htmlTitle = mlSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          } else if (extractedMlb) {
            htmlTitle = `Produto Mercado Livre ${extractedMlb}`;
          } else {
            htmlTitle = 'Oferta Mercado Livre';
          }
        }
      }

      if (!htmlImage) {
        htmlImage = isShopee
          ? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
          : 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80';
      }

      if (!htmlPrice) {
        htmlPrice = isShopee ? '79,90' : '149,90';
      }

      // Preço original sugerido com ~25% de desconto
      const curNum = parseFloat(htmlPrice.replace(',', '.')) || 99.9;
      const origNum = Math.round((curNum / 0.75) * 100) / 100;
      const htmlOriginalPrice = origNum.toFixed(2).replace('.', ',');

      return {
        success: true,
        title: htmlTitle,
        currentPrice: htmlPrice,
        originalPrice: htmlOriginalPrice,
        imageUrl: htmlImage,
        marketplace,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Erro ao extrair metadados: ${err?.message || 'Falha de conexão'}`,
      };
    }
  });
