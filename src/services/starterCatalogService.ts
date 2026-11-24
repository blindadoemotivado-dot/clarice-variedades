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
 * Clona 20 produtos reais ativos (10 Mercado Livre + 10 Shopee) da vitrine de referência
 * para uma loja parceira, aplicando automaticamente os códigos de afiliado da loja destino.
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

    // 2. Busca 10 produtos reais do Mercado Livre e 10 da Shopee (ativos)
    const { data: mlItems, error: mlError } = await supabase
      .from('produtos_clarice')
      .select('*')
      .eq('marketplace', 'mercadolivre')
      .eq('status', 'ativo')
      .order('featured', { ascending: false })
      .limit(10);

    const { data: shopeeItems, error: shopeeError } = await supabase
      .from('produtos_clarice')
      .select('*')
      .eq('marketplace', 'shopee')
      .eq('status', 'ativo')
      .order('featured', { ascending: false })
      .limit(10);

    if (mlError || shopeeError) {
      console.warn('[starterCatalogService] Erro ao buscar itens de referência:', mlError || shopeeError);
    }

    const sourceProducts = [...(mlItems || []), ...(shopeeItems || [])];

    if (sourceProducts.length === 0) {
      return {
        success: false,
        count: 0,
        message: 'Nenhum produto de referência encontrado para clonagem.',
      };
    }

    // 3. Mapeia e injeta os links de afiliado exclusivos da loja destino
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
      message: `Vitrine abastecida com sucesso! ${rowsToInsert.length} ofertas reais adicionadas à loja.`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: `Erro inesperado ao clonar catálogo: ${err?.message || 'Falha de rede'}`,
    };
  }
}
