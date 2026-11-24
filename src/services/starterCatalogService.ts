import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchStoreBySlug } from './tenantService';
import { applyStoreAffiliateTracking } from '@/utils/affiliateUrl';
import type { AffiliateProduct } from '@/types/product';

export interface CloneCatalogResult {
  success: boolean;
  count: number;
  message: string;
}

/**
 * Valida via requisição HTTP leve se uma URL de imagem é acessível e retorna uma imagem real.
 * Rejeita erros HTTP, timeouts, URLs vazias, e imagens gif/placeholder vazias (como tracking pixels do ML).
 */
export async function validateImageUrl(url?: string): Promise<boolean> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;

  // Descarta padrões conhecidos de tracking pixel de 0-bytes
  if (url.includes('http2.mlstatic.com') && url.endsWith('-O.webp')) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // Tenta primeiro HEAD; se o servidor retornar 405 (Method Not Allowed), 403 ou falhar, tenta GET leve
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (res.status === 405 || res.status === 403 || !res.ok) {
      res = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    clearTimeout(timeout);

    const ct = res.headers.get('content-type') || '';
    const isImage = res.ok && ct.startsWith('image/') && !ct.includes('gif');
    return isImage;
  } catch {
    return false;
  }
}

/**
 * Clona 20 produtos reais ativos (10 Mercado Livre + 10 Shopee) com imagens verificadas
 * da vitrine de referência para uma loja parceira, aplicando automaticamente os códigos de afiliado da loja destino.
 */
export async function cloneStarterCatalogToStore(targetSlug: string): Promise<CloneCatalogResult> {
  const cleanSlug = targetSlug.trim().toLowerCase();
  if (!cleanSlug) {
    return { success: false, count: 0, message: 'Slug da loja inválido.' };
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      count: 0,
      message: 'Supabase não configurado. Catálogo padrão mantido em cache local.',
    };
  }

  try {
    // 1. Obtém dados de rastreamento da loja destino
    const store = await fetchStoreBySlug(cleanSlug);

    // 2. Busca lote ampliado de candidatos ativos (ordenando destaques primeiro) para validar imagens
    const { data: mlCandidates, error: mlError } = await supabase
      .from('produtos_clarice')
      .select('*')
      .eq('marketplace', 'mercadolivre')
      .eq('status', 'ativo')
      .order('featured', { ascending: false })
      .limit(35);

    const { data: shopeeCandidates, error: shopeeError } = await supabase
      .from('produtos_clarice')
      .select('*')
      .eq('marketplace', 'shopee')
      .eq('status', 'ativo')
      .order('featured', { ascending: false })
      .limit(35);

    if (mlError || shopeeError) {
      console.warn('[starterCatalogService] Erro ao buscar itens de referência:', mlError || shopeeError);
    }

    // 3. Validação HTTP concorrente das imagens para selecionar apenas produtos com fotos reais e funcionais
    const validMlItems: any[] = [];
    if (mlCandidates && mlCandidates.length > 0) {
      const mlChecks = await Promise.all(
        mlCandidates.map(async (item) => ({
          item,
          isValid: await validateImageUrl(item.image_url),
        }))
      );
      for (const check of mlChecks) {
        if (check.isValid) {
          validMlItems.push(check.item);
          if (validMlItems.length >= 10) break;
        }
      }
    }

    const validShopeeItems: any[] = [];
    if (shopeeCandidates && shopeeCandidates.length > 0) {
      const shopeeChecks = await Promise.all(
        shopeeCandidates.map(async (item) => ({
          item,
          isValid: await validateImageUrl(item.image_url),
        }))
      );
      for (const check of shopeeChecks) {
        if (check.isValid) {
          validShopeeItems.push(check.item);
          if (validShopeeItems.length >= 10) break;
        }
      }
    }

    // Garante balanceamento de destaques: exatamente 2 destaques no ML e 2 na Shopee (4 destaques no total)
    validMlItems.forEach((item, idx) => {
      item.featured = idx < 2;
    });
    validShopeeItems.forEach((item, idx) => {
      item.featured = idx < 2;
    });

    const sourceProducts = [...validMlItems, ...validShopeeItems];

    if (sourceProducts.length === 0) {
      return {
        success: false,
        count: 0,
        message: 'Nenhum produto com imagem válida encontrado para clonagem.',
      };
    }

    // 4. Mapeia e injeta os links de afiliado exclusivos da loja destino
    const rowsToInsert = sourceProducts.map((p) => {
      const tracking = applyStoreAffiliateTracking(p.affiliate_url, store);
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const baseMlb = (p.mlb_id || '').replace(/-[a-z0-9_-]+$/i, '');
      const uniqueMlb = `${baseMlb || 'PROD'}-${cleanSlug}`;

      return {
        id: newId,
        mlb_id: uniqueMlb,
        title: p.title,
        original_price: p.original_price,
        current_price: p.current_price,
        discount_percent: p.discount_percent,
        installments_text: p.installments_text,
        image_url: p.image_url,
        affiliate_url: tracking.finalUrl,
        category: p.category,
        badge_text: p.badge_text,
        free_shipping: p.free_shipping,
        is_full: p.is_full,
        rating: p.rating,
        reviews_count: p.reviews_count,
        featured: p.featured,
        active: true,
        status: 'ativo',
        marketplace: p.marketplace,
        loja_slug: cleanSlug,
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from('produtos_clarice')
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      return {
        success: false,
        count: 0,
        message: `Falha ao clonar produtos: ${insertError.message}`,
      };
    }

    return {
      success: true,
      count: inserted?.length || rowsToInsert.length,
      message: `Vitrine abastecida com sucesso! ${rowsToInsert.length} ofertas reais com imagens verificadas adicionadas à loja.`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: `Erro inesperado ao clonar catálogo: ${err?.message || 'Falha de rede'}`,
    };
  }
}
