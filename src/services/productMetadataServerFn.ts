import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import * as shopeeOpenApi from './shopeeOpenApi';

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

export interface ExtractProductMetadataOptions {
  lojaSlug?: string | undefined;
  shopeeAppId?: string | undefined;
  shopeeSecret?: string | undefined;
  preservedCurrentPrice?: string | undefined;
  preservedOriginalPrice?: string | undefined;
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
export async function extractProductMetadata(
  rawUrl: string,
  options?: ExtractProductMetadataOptions
): Promise<ExtractProductMetadataResult> {
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

    // 2. Para links encurtados da Shopee ou ML, resolve o primeiro salto para obter o destino canônico
    if (
      currentUrl.includes('s.shopee.com.br') ||
      currentUrl.includes('shp.ee') ||
      currentUrl.includes('meli.la') ||
      currentUrl.includes('/sec/')
    ) {
      try {
        const manualRes = await fetch(currentUrl, { redirect: 'manual' });
        const loc = manualRes.headers.get('location');
        if (loc) {
          resolvedUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).toString();
        }
      } catch {
        // ignore
      }
    }

    // 3. Fetch com bot User-Agent (WhatsApp) para obter meta tags ricas e fotos sem bloqueio
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
      if (botRes.url && resolvedUrl === currentUrl) {
        resolvedUrl = botRes.url;
      }
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

    // 4. Se for Shopee, tenta consultar a Shopee Affiliate Open API (GraphQL) oficial
    if (isShopee) {
      const itemId =
        shopeeOpenApi.extractShopeeItemId(resolvedUrl) ||
        shopeeOpenApi.extractShopeeItemId(currentUrl);
      if (itemId) {
        let shopeeAppId = options?.shopeeAppId?.trim();
        let shopeeSecret = options?.shopeeSecret?.trim();

        // Se a loja não passou ou passou secret legado com "|", tenta buscar credenciais da loja ou variáveis globais
        if ((!shopeeAppId || !shopeeSecret || shopeeSecret.includes('|')) && options?.lojaSlug && supabaseKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
            const { data: storeData } = await supabase
              .from('lojas_afiliados')
              .select('shopee_app_id, shopee_secret')
              .eq('slug', options.lojaSlug)
              .maybeSingle();

            if (storeData) {
              if (storeData.shopee_app_id) shopeeAppId = storeData.shopee_app_id;
              if (storeData.shopee_secret && !storeData.shopee_secret.includes('|')) {
                shopeeSecret = storeData.shopee_secret;
              }
            }
          } catch {
            // ignore
          }
        }

        // Fallback para variáveis de ambiente globais da aplicação
        if (!shopeeAppId) {
          shopeeAppId = env['SHOPEE_AFFILIATE_APP_ID'] || env['VITE_SHOPEE_AFFILIATE_APP_ID'] || '';
        }
        if (!shopeeSecret || shopeeSecret.includes('|')) {
          shopeeSecret = env['SHOPEE_AFFILIATE_SECRET'] || env['VITE_SHOPEE_AFFILIATE_SECRET'] || '';
        }

        if (shopeeAppId && shopeeSecret && !shopeeSecret.includes('|')) {
          try {
            const openApiOffer = await shopeeOpenApi.fetchShopeeProductOffer(itemId, {
              appId: shopeeAppId,
              secret: shopeeSecret,
            });

            if (openApiOffer && openApiOffer.title) {
              const curPrice =
                openApiOffer.currentPrice || options?.preservedCurrentPrice || undefined;
              const origPrice =
                openApiOffer.originalPrice || options?.preservedOriginalPrice || undefined;

              return {
                success: true,
                title: cleanTitle(openApiOffer.title),
                currentPrice: curPrice,
                originalPrice: origPrice,
                imageUrl: openApiOffer.imageUrl || undefined,
                marketplace: 'shopee',
                resolvedUrl,
                partial: !curPrice || !openApiOffer.imageUrl,
              };
            }
          } catch (apiErr) {
            console.warn('[productMetadataServerFn] Erro Shopee Open API:', apiErr);
          }
        }
      }
    }

    // 5. Extração de Título Real via HTML
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

    // 6. Extração de Imagem Real (ZERO UNSPLASH - se não achar, fica undefined)
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

    // 7. Extração de Preço Real (ZERO PREÇO INVENTADO - se não achar, verifica se veio preservado do texto colado)
    let extractedPrice: string | undefined = options?.preservedCurrentPrice || undefined;
    let originalPrice: string | undefined = options?.preservedOriginalPrice || undefined;

    if (!extractedPrice && html) {
      const priceMatch =
        html.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([\d.,]+)["']/i) ||
        html.match(/<meta[^>]*content=["']([\d.,]+)["'][^>]*property=["'](?:product:price:amount|og:price:amount)["']/i);

      if (priceMatch?.[1]) {
        extractedPrice = priceMatch[1].replace('.', ',');
      }
    }

    // 8. Extração via JSON-LD estruturado se disponível
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
              else if (img?.url && typeof img.url === 'string') extractedImage = img.url;
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
      originalPrice,
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
  .validator((d: {
    url: string;
    lojaSlug?: string;
    shopeeAppId?: string;
    shopeeSecret?: string;
    preservedCurrentPrice?: string;
    preservedOriginalPrice?: string;
  }) => d)
  .handler(async (ctx): Promise<ExtractProductMetadataResult> => {
    return extractProductMetadata(ctx.data?.url || '', {
      lojaSlug: ctx.data?.lojaSlug,
      shopeeAppId: ctx.data?.shopeeAppId,
      shopeeSecret: ctx.data?.shopeeSecret,
      preservedCurrentPrice: ctx.data?.preservedCurrentPrice,
      preservedOriginalPrice: ctx.data?.preservedOriginalPrice,
    });
  });
