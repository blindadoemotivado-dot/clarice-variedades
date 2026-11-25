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
  resolvedUrl?: string | undefined;
  partial?: boolean | undefined;
  warning?: string | undefined;
  error?: string | undefined;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*\|\s*(Mercado\s*Livre|Shopee|Frete\s*Gr[áa]tis).*$/i, '')
    .replace(/\s*-\s*(Mercado\s*Livre|Shopee).*$/i, '')
    .replace(/\s*\.\.\.$/, '')
    .trim();
}

/**
 * Função de extração pura para obter metadados reais (título, preço e foto).
 * Poka-Yoke: NUNCA preenche preços ou fotos com dados falsos/mockados (zero Unsplash / zero 79.90).
 */
export async function extractProductMetadata(rawUrl: string): Promise<ExtractProductMetadataResult> {
  const currentUrl = rawUrl?.trim();
  if (!currentUrl) {
    return { success: false, error: 'URL inválida.' };
  }

  try {
    const isShopee = currentUrl.includes('shopee') || currentUrl.includes('shp.ee');
    const marketplace: 'mercadolivre' | 'shopee' = isShopee ? 'shopee' : 'mercadolivre';
    let resolvedUrl = currentUrl;
    let html = '';

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

    if (supabaseKey && (extractedMlb || !isShopee)) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        let query = supabase.from('produtos_clarice').select('title, current_price, original_price, image_url, category');

        if (extractedMlb) {
          query = query.or(`mlb_id.ilike.%${extractedMlb}%,affiliate_url.ilike.%${extractedMlb}%`);
        } else {
          query = query.ilike('affiliate_url', `%${currentUrl.slice(0, 40)}%`);
        }

        const { data, error } = await query.limit(1).maybeSingle();
        if (!error && data && data.title && data.current_price && data.image_url) {
          return {
            success: true,
            title: String(data.title),
            currentPrice: Number(data.current_price).toFixed(2).replace('.', ','),
            originalPrice: data.original_price ? Number(data.original_price).toFixed(2).replace('.', ',') : undefined,
            imageUrl: String(data.image_url),
            category: data.category ? String(data.category) : undefined,
            marketplace,
            resolvedUrl,
            partial: false,
          };
        }
      } catch {
        // ignore DB error, proceed to fetch
      }
    }

    // 2. Fetch com bot User-Agent (WhatsApp) para seguir redirects e contornar anti-scraping
    try {
      const botRes = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'WhatsApp/2.23.20.76 I',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
        },
      });
      resolvedUrl = botRes.url || currentUrl;
      if (botRes.ok) {
        html = await botRes.text();
      }
    } catch {
      // bot fetch failed, try browser UA below
    }

    // 3. Fallback de requisição com navegador desktop se bot não retornou HTML suficiente
    if (!html || html.length < 500) {
      try {
        const browserRes = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
          },
        });
        resolvedUrl = browserRes.url || resolvedUrl;
        if (browserRes.ok) {
          html = await browserRes.text();
        }
      } catch {
        // fetch error
      }
    }

    // 4. Extração de Título Real
    let extractedTitle = '';

    // Para Shopee: a meta description contém o título completo sem truncar com '...'
    if (isShopee && html) {
      const descMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      const desc = descMatch?.[1];
      if (desc) {
        const buyMatch = desc.match(/Compre\s+(.*?)\s+na Shopee Brasil!/i);
        if (buyMatch?.[1]) {
          extractedTitle = cleanTitle(buyMatch[1]);
        }
      }
    }

    // Se ainda não encontrou ou não é Shopee, busca no og:title
    if (!extractedTitle && html) {
      const ogTitleMatch =
        html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
        html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);

      if (ogTitleMatch?.[1]) {
        extractedTitle = cleanTitle(ogTitleMatch[1]);
      }
    }

    // Fallback de título derivado dos slugs da URL (da resolvedUrl e da URL original)
    if (!extractedTitle) {
      const urlsToInspect = [resolvedUrl, currentUrl];
      for (const u of urlsToInspect) {
        if (isShopee) {
          const shopeeSlugMatch = u.match(/shopee\.com\.br\/([^?]+)-i\./i);
          if (shopeeSlugMatch?.[1]) {
            const rawSlug = decodeURIComponent(shopeeSlugMatch[1]).replace(/[-_]+/g, ' ').trim();
            if (rawSlug) {
              extractedTitle = cleanTitle(rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1));
              break;
            }
          }
        } else {
          const mlSlugMatch = u.match(/MLB-?\d+-([a-zA-Z0-9_-]+)/i);
          if (mlSlugMatch?.[1]) {
            const rawSlug = decodeURIComponent(mlSlugMatch[1]).replace(/[-_]+/g, ' ').trim();
            if (rawSlug) {
              extractedTitle = cleanTitle(rawSlug.replace(/\b\w/g, (c) => c.toUpperCase()));
              break;
            }
          }
          const mlPathSlug = u.split('/').find((s) => /[a-z]-[a-z]/i.test(s) && !/MLB/i.test(s));
          if (mlPathSlug) {
            extractedTitle = cleanTitle(mlPathSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
            break;
          }
        }
      }
    }

    // 5. Extração de Imagem Real (ZERO UNSPLASH - se não achar, fica undefined)
    let extractedImage: string | undefined = undefined;
    if (html) {
      const ogImgMatch =
        html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
        html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

      if (ogImgMatch?.[1] && ogImgMatch[1].startsWith('http')) {
        const candidate = ogImgMatch[1].trim();
        // Ignorar imagens genéricas de logo
        if (!candidate.includes('homepagefe') && !candidate.includes('shopee-logo') && !candidate.includes('logo_ml')) {
          extractedImage = candidate;
        }
      }
    }

    // 6. Extração de Preço Real (ZERO PREÇO INVENTADO - se não achar, fica undefined)
    let extractedPrice: string | undefined = undefined;
    if (html) {
      const priceMatch =
        html.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([\d.,]+)["']/i) ||
        html.match(/<meta[^>]*content=["']([\d.,]+)["'][^>]*property=["'](?:product:price:amount|og:price:amount)["']/i);

      if (priceMatch?.[1]) {
        extractedPrice = priceMatch[1].replace('.', ',');
      }
    }

    // 7. Extração via JSON-LD estruturado se disponível
    if (html && (!extractedImage || !extractedPrice || !extractedTitle)) {
      const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      for (const m of ldMatches) {
        try {
          const parsed = JSON.parse(m[1]);
          const item = Array.isArray(parsed) ? parsed[0] : parsed;
          if (item) {
            if (!extractedTitle && item.name) {
              extractedTitle = cleanTitle(String(item.name));
            }
            if (!extractedImage && item.image) {
              const img = Array.isArray(item.image) ? item.image[0] : item.image;
              if (typeof img === 'string' && img.startsWith('http')) extractedImage = img;
              else if (img?.url && typeof img.url === 'string') imageUrl = img.url;
            }
            if (!extractedPrice && item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              const p = offers?.price || offers?.lowPrice;
              if (p) extractedPrice = Number(p).toFixed(2).replace('.', ',');
            }
          }
        } catch {
          // json parse error
        }
      }
    }

    if (!extractedTitle && !extractedImage) {
      return {
        success: false,
        error: 'Não foi possível extrair dados automaticamente deste link. Preencha os campos manualmente.',
      };
    }

    const isPartial = !extractedPrice || !extractedImage;
    const warning = isPartial
      ? isShopee
        ? (!extractedImage
            ? '⚠️ A Shopee bloqueou a leitura automática de preço e foto deste link. Confira o título extraído e preencha o preço e a imagem manualmente (ou use o botão Enviar Foto).'
            : '⚠️ A Shopee bloqueou a leitura automática de preço deste link. Confira o título e foto extraídos e preencha o preço manualmente.')
        : (!extractedImage
            ? '⚠️ O Mercado Livre bloqueou a leitura automática de preço e foto deste link. Preencha os dados manualmente.'
            : '⚠️ O Mercado Livre bloqueou a leitura automática de preço deste link. Preencha o preço manualmente.')
      : undefined;

    return {
      success: true,
      title: extractedTitle || undefined,
      currentPrice: extractedPrice,
      originalPrice: undefined,
      imageUrl: extractedImage,
      marketplace,
      resolvedUrl,
      partial: isPartial,
      warning,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao extrair metadados: ${err?.message || 'Falha de conexão'}`,
    };
  }
}

/**
 * Server Function para extrair metadados reais (título, preços e foto)
 * a partir de qualquer link de produto do Mercado Livre ou Shopee.
 */
export const extractProductMetadataServerFn = createServerFn({ method: 'POST' })
  .validator((d: { url: string }) => d)
  .handler(async (ctx): Promise<ExtractProductMetadataResult> => {
    return extractProductMetadata(ctx.data?.url || '');
  });
