/**
 * Utilitário de Injeção e Rastreamento Automático de Links de Afiliado
 * Suporta Mercado Livre e Shopee com isolamento permanente por loja.
 */

export interface AffiliateStoreTracking {
  mlAffiliateTag?: string;
  mlMattTool?: string;
  shopeeAffiliateId?: string;
  shopeeAppId?: string;
  slug?: string;
  [key: string]: any;
}

export interface AffiliateTrackingResult {
  finalUrl: string;
  tracked: boolean;
  network: 'ml' | 'shopee' | 'other';
}

/**
 * Aplica injeção automática de parâmetros de rastreamento de afiliados (Mercado Livre e Shopee)
 * conforme as credenciais configuradas na loja parceira.
 *
 * - Shopee: anexa af_siteid e utm_source caso ainda não existam no link.
 * - Mercado Livre: preserva links curtos meli.la e links /sec/ (já com token de afiliado),
 *   e anexa matt_word em links longos caso não possuam matt_tool/matt_word.
 */
export function applyStoreAffiliateTracking(
  rawUrl: string,
  store?: AffiliateStoreTracking | null
): AffiliateTrackingResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { finalUrl: '', tracked: false, network: 'other' };
  }

  const url = rawUrl.trim();
  const lowerUrl = url.toLowerCase();

  // 1. SHOPEE (shopee.com.br / s.shopee.com.br / shp.ee)
  if (lowerUrl.includes('shopee.com') || lowerUrl.includes('shp.ee')) {
    const shopeeId = (
      store?.shopeeAffiliateId ||
      store?.shopeeAppId ||
      (store?.slug === 'clarice' ? '18364201389' : '')
    )?.trim();

    if (shopeeId) {
      try {
        const parsed = new URL(url);
        parsed.searchParams.set('af_siteid', shopeeId);
        parsed.searchParams.set('utm_source', `an_${shopeeId}`);
        parsed.searchParams.set('utm_medium', 'affiliates');
        return {
          finalUrl: parsed.toString(),
          tracked: true,
          network: 'shopee',
        };
      } catch {
        const separator = url.includes('?') ? '&' : '?';
        const trackingParams = `af_siteid=${encodeURIComponent(shopeeId)}&utm_source=an_${encodeURIComponent(shopeeId)}&utm_medium=affiliates`;
        return {
          finalUrl: `${url}${separator}${trackingParams}`,
          tracked: true,
          network: 'shopee',
        };
      }
    }

    const hasExistingTracking =
      lowerUrl.includes('af_siteid=') || lowerUrl.includes('utm_source=');

    if (hasExistingTracking) {
      return { finalUrl: url, tracked: true, network: 'shopee' };
    }

    return { finalUrl: url, tracked: false, network: 'shopee' };
  }

  // 2. MERCADO LIVRE (mercadolivre.com.br / meli.la / mercadolivre.com)
  if (lowerUrl.includes('mercadolivre.com') || lowerUrl.includes('meli.la')) {
    // Links curtos meli.la ou /sec/ já carregam o token oficial da sessão ML
    const isShortOrSec = lowerUrl.includes('meli.la/') || lowerUrl.includes('/sec/');
    if (isShortOrSec) {
      return { finalUrl: url, tracked: true, network: 'ml' };
    }

    const mlTag = store?.mlAffiliateTag?.trim();
    const mlTool = store?.mlMattTool?.trim();

    if (mlTag || mlTool) {
      try {
        const parsed = new URL(url);
        if (mlTag) parsed.searchParams.set('matt_word', mlTag);
        if (mlTool) parsed.searchParams.set('matt_tool', mlTool);
        return {
          finalUrl: parsed.toString(),
          tracked: true,
          network: 'ml',
        };
      } catch {
        const separator = url.includes('?') ? '&' : '?';
        const parts: string[] = [];
        if (mlTag) parts.push(`matt_word=${encodeURIComponent(mlTag)}`);
        if (mlTool) parts.push(`matt_tool=${encodeURIComponent(mlTool)}`);
        return {
          finalUrl: `${url}${separator}${parts.join('&')}`,
          tracked: true,
          network: 'ml',
        };
      }
    }

    const hasExistingTracking =
      lowerUrl.includes('matt_tool=') || lowerUrl.includes('matt_word=');
    if (hasExistingTracking) {
      return { finalUrl: url, tracked: true, network: 'ml' };
    }

    return { finalUrl: url, tracked: false, network: 'ml' };
  }

  // 3. OUTROS DOMÍNIOS
  return { finalUrl: url, tracked: false, network: 'other' };
}
