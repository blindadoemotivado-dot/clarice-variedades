/**
 * Utilitário de Injeção e Rastreamento Automático de Links de Afiliado
 * Suporta Mercado Livre e Shopee com isolamento permanente por loja.
 */

export interface AffiliateStoreTracking {
  mlAffiliateTag?: string;
  shopeeAffiliateId?: string;
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
    const hasExistingTracking =
      lowerUrl.includes('af_siteid=') || lowerUrl.includes('utm_source=');

    if (hasExistingTracking) {
      return { finalUrl: url, tracked: true, network: 'shopee' };
    }

    const shopeeId = store?.shopeeAffiliateId?.trim();
    if (shopeeId) {
      const separator = url.includes('?') ? '&' : '?';
      const trackingParams = `af_siteid=${encodeURIComponent(shopeeId)}&utm_source=an_${encodeURIComponent(shopeeId)}`;
      return {
        finalUrl: `${url}${separator}${trackingParams}`,
        tracked: true,
        network: 'shopee',
      };
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

    const hasExistingTracking =
      lowerUrl.includes('matt_tool=') || lowerUrl.includes('matt_word=');
    if (hasExistingTracking) {
      return { finalUrl: url, tracked: true, network: 'ml' };
    }

    const mlTag = store?.mlAffiliateTag?.trim();
    if (mlTag) {
      const separator = url.includes('?') ? '&' : '?';
      return {
        finalUrl: `${url}${separator}matt_word=${encodeURIComponent(mlTag)}`,
        tracked: true,
        network: 'ml',
      };
    }

    return { finalUrl: url, tracked: false, network: 'ml' };
  }

  // 3. OUTROS DOMÍNIOS
  return { finalUrl: url, tracked: false, network: 'other' };
}
