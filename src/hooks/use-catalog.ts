import { useCallback, useEffect, useState } from 'react';
import type { AffiliateProduct } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RadarSyncResult } from '@/services/radarServerFn';

const FAV_KEY = 'clarice:favorites:v1';
const LEGACY_FAV_KEY = 'zizi:favorites:v1';
const DEMO_MLB_IDS = new Set(MOCK_PRODUCTS.map((p) => p.mlbId));

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Reads the current key, falling back to the pre-rename key so existing data survives. */
function readWithLegacy<T>(key: string, legacyKey: string, fallback: T): T {
  const current = read<T | null>(key, null);
  return current === null ? read(legacyKey, fallback) : current;
}

interface SupabaseProductRow {
  id: string;
  mlb_id: string;
  title: string;
  original_price: number | string;
  current_price: number | string;
  discount_percent: number | null;
  installments_text: string | null;
  image_url: string;
  affiliate_url: string;
  category: string;
  badge_text: string | null;
  free_shipping: boolean | null;
  is_full: boolean | null;
  rating: number | string | null;
  reviews_count: number | null;
  featured: boolean | null;
  active: boolean | null;
  status?: string | null;
  marketplace?: string | null;
  loja_slug?: string | null;
}

function mapRowToProduct(row: SupabaseProductRow): AffiliateProduct {
  const isShopee =
    row.marketplace === 'shopee' ||
    (typeof row.affiliate_url === 'string' &&
      (row.affiliate_url.includes('shopee.com') || row.affiliate_url.includes('shp.ee')));

  return {
    id: row.id,
    mlbId: row.mlb_id,
    title: row.title,
    originalPrice: Number(row.original_price),
    currentPrice: Number(row.current_price),
    discountPercent: Number(row.discount_percent ?? 0),
    installmentsText: row.installments_text ?? 'À vista',
    imageUrl: row.image_url,
    affiliateUrl: row.affiliate_url,
    category: row.category as AffiliateProduct['category'],
    badgeText: (row.badge_text as AffiliateProduct['badgeText']) || undefined,
    freeShipping: Boolean(row.free_shipping),
    isFull: Boolean(row.is_full),
    rating: Number(row.rating ?? 4.8),
    reviewsCount: Number(row.reviews_count ?? 0),
    featured: Boolean(row.featured),
    status: row.status ?? (row.active ? 'ativo' : 'pendente_afiliado'),
    marketplace: isShopee ? 'shopee' : 'mercadolivre',
    lojaSlug: row.loja_slug || 'clarice',
  };
}

export function useCatalog(lojaSlug?: string) {
  const activeSlug = (lojaSlug || 'clarice').trim().toLowerCase();
  const isClarice = activeSlug === 'clarice' || activeSlug === 'todos';

  // Chaves de cache estritamente isoladas por tenant
  const storeKey = isClarice ? 'clarice_v2' : `clarice_catalog_cache_${activeSlug}`;
  const favKey = isClarice ? FAV_KEY : `clarice_favorites_${activeSlug}`;

  // Estado inicial: para lojas parceiras, NUNCA usa dados da clarice
  const [products, setProducts] = useState<AffiliateProduct[]>(() => {
    if (typeof window === 'undefined') return [];
    const cached = read<AffiliateProduct[]>(storeKey, []);
    return isClarice ? cached : cached.filter((p) => p.lojaSlug === activeSlug);
  });
  const [pendingProducts, setPendingProducts] = useState<AffiliateProduct[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return isClarice ? readWithLegacy(favKey, LEGACY_FAV_KEY, []) : read(favKey, []);
  });
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) {
      if (!isClarice) {
        setProducts([]);
      }
      return;
    }

    setIsSyncing(true);
    try {
      let activeQuery = supabase
        .from('produtos_clarice')
        .select('*')
        .eq('active', true);

      if (isClarice) {
        activeQuery = activeQuery.or('loja_slug.eq.clarice,loja_slug.is.null');
      } else {
        // FILTRO RÍGIDO E OBRIGATÓRIO: somente produtos exclusivos do tenant
        activeQuery = activeQuery.eq('loja_slug', activeSlug);
      }

      const [activeRes, pendingRes] = await Promise.all([
        activeQuery
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false }),
        !isClarice
          ? Promise.resolve({ data: [] as SupabaseProductRow[], error: null })
          : supabase
              .from('produtos_clarice')
              .select('*')
              .eq('status', 'pendente_afiliado')
              .order('created_at', { ascending: false }),
      ]);

      if (!activeRes.error && Array.isArray(activeRes.data)) {
        const mapped = (activeRes.data as SupabaseProductRow[]).map(mapRowToProduct);
        // Trava inquebrável em memória
        const strictlyIsolated = isClarice
          ? mapped
          : mapped.filter((p) => p.lojaSlug === activeSlug);
        setProducts(strictlyIsolated);
      } else if (activeRes.error) {
        console.warn('[useCatalog] Aviso ao buscar produtos ativos:', activeRes.error.message);
        if (!isClarice) {
          // Zero fallback para lojas parceiras em caso de erro!
          setProducts([]);
        }
      } else if (!isClarice) {
        setProducts([]);
      }

      if (!pendingRes.error && Array.isArray(pendingRes.data)) {
        setPendingProducts((pendingRes.data as SupabaseProductRow[]).map(mapRowToProduct));
      } else if (!isClarice) {
        setPendingProducts([]);
      }
    } catch (err) {
      console.warn('[useCatalog] Conexão com Supabase indisponível:', err);
      if (!isClarice) {
        setProducts([]);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isClarice, activeSlug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Carrega inicial do cache local estritamente isolado
    const cached = read<AffiliateProduct[]>(storeKey, []);
    const strictlyIsolated = isClarice ? cached : cached.filter((p) => p.lojaSlug === activeSlug);
    setProducts(strictlyIsolated);
    setFavorites(isClarice ? readWithLegacy(favKey, LEGACY_FAV_KEY, []) : read(favKey, []));
    setLoaded(true);

    // 2. Conecta ao Supabase para carregar produtos reais
    fetchCatalog();
  }, [fetchCatalog, storeKey, favKey, isClarice, activeSlug]);

  useEffect(() => {
    if (loaded && typeof window !== 'undefined') {
      const strictlyIsolated = isClarice
        ? products
        : products.filter((p) => p.lojaSlug === activeSlug);
      localStorage.setItem(storeKey, JSON.stringify(strictlyIsolated));
    }
  }, [products, loaded, storeKey, isClarice, activeSlug]);

  useEffect(() => {
    if (loaded && typeof window !== 'undefined') {
      localStorage.setItem(favKey, JSON.stringify(favorites));
    }
  }, [favorites, loaded, favKey]);

  const approveProduct = useCallback(async (id: string, customAffiliateUrl?: string) => {
    const target = pendingProducts.find((p) => p.id === id);
    if (!target) return;

    const finalUrl = customAffiliateUrl?.trim() || target.affiliateUrl;
    const approvedProduct: AffiliateProduct = {
      ...target,
      affiliateUrl: finalUrl,
      status: 'ativo',
      lojaSlug: isClarice ? target.lojaSlug || 'clarice' : activeSlug,
    };

    setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    setProducts((prev) => [approvedProduct, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('produtos_clarice')
          .update({
            active: true,
            status: 'ativo',
            affiliate_url: finalUrl,
          })
          .eq('id', id);

        if (error) {
          console.error('[useCatalog] Erro ao aprovar produto:', error.message);
        }
      } catch (err) {
        console.error('[useCatalog] Falha de conexão ao aprovar:', err);
      }
    }
  }, [pendingProducts, isClarice, activeSlug]);

  const rejectPending = useCallback(async (id: string) => {
    setPendingProducts((prev) => prev.filter((p) => p.id !== id));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('produtos_clarice')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[useCatalog] Erro ao rejeitar produto pendente:', error.message);
        }
      } catch (err) {
        console.error('[useCatalog] Falha de conexão ao excluir:', err);
      }
    }
  }, []);

  const clearDemoProducts = useCallback(async () => {
    setProducts((prev) => prev.filter((p) => !DEMO_MLB_IDS.has(p.mlbId) && !p.id.startsWith('seed-')));

    if (isSupabaseConfigured) {
      try {
        const demoMlbs = Array.from(DEMO_MLB_IDS);
        await supabase
          .from('produtos_clarice')
          .delete()
          .in('mlb_id', demoMlbs);
      } catch (err) {
        console.warn('[useCatalog] Erro ao remover produtos demo no Supabase:', err);
      }
    }
  }, []);

  const syncRadar = useCallback(async (): Promise<RadarSyncResult> => {
    setIsSyncing(true);
    try {
      let total = 0;
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('produtos_clarice')
          .select('*')
          .eq('status', 'pendente_afiliado')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = (data as SupabaseProductRow[]).map(mapRowToProduct);
          setPendingProducts(mapped);
          total = mapped.length;
        } else if (error) {
          console.error('[useCatalog] Erro ao carregar fila do radar do Supabase:', error.message);
        }
      }

      const message =
        total === 0
          ? 'Fila do Radar vazia — todos os achadinhos já foram publicados. Aguarde o próximo ciclo automático ou execute .\\rodar-clarice.ps1.'
          : `Fila do Radar atualizada! ${total} achadinho(s) aguardando aprovação na fila.`;

      return {
        success: true,
        newDealsCount: 0,
        totalPendingCount: total,
        message,
      };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    products,
    pendingProducts,
    favorites,
    isSyncing,
    fetchCatalog,
    syncRadar,
    clearDemoProducts,
    approveProduct,
    rejectPending,
    add: useCallback(
      (items: AffiliateProduct[]) => {
        const tagged = isClarice
          ? items
          : items.map((p) => ({ ...p, lojaSlug: activeSlug }));
        setProducts((p) => [...tagged, ...p]);
      },
      [isClarice, activeSlug]
    ),
    remove: useCallback(async (id: string) => {
      setProducts((p) => p.filter((x) => x.id !== id));
      if (isSupabaseConfigured) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          let query = supabase.from('produtos_clarice').delete();
          query = isUuid ? query.eq('id', id) : query.eq('mlb_id', id);
          const { error } = await query;
          if (error) console.warn('[useCatalog] Erro ao remover do Supabase:', error.message);
        } catch (err) {
          console.warn('[useCatalog] Falha ao deletar item do Supabase:', err);
        }
      }
    }, []),
    batchRemove: useCallback(async (ids: string[]) => {
      const set = new Set(ids);
      setProducts((p) => p.filter((x) => !set.has(x.id)));
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('produtos_clarice')
            .delete()
            .in('id', ids);
          if (error) console.warn('[useCatalog] Erro ao remover lote do Supabase:', error.message);
        } catch (err) {
          console.warn('[useCatalog] Falha de conexão ao remover lote:', err);
        }
      }
    }, []),
    emptyCatalog: useCallback(async () => {
      setProducts([]);
      if (isSupabaseConfigured) {
        try {
          let query = supabase.from('produtos_clarice').delete();
          if (isClarice) {
            query = query.or('loja_slug.eq.clarice,loja_slug.is.null');
          } else {
            query = query.eq('loja_slug', activeSlug);
          }
          await query;
        } catch (err) {
          console.warn('[useCatalog] Falha de conexão ao esvaziar catálogo:', err);
        }
      }
    }, [isClarice, activeSlug]),
    batchRejectPending: useCallback(async (ids: string[]) => {
      const set = new Set(ids);
      setPendingProducts((p) => p.filter((x) => !set.has(x.id)));
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('produtos_clarice')
            .delete()
            .in('id', ids);
          if (error) console.warn('[useCatalog] Erro ao rejeitar lote no Supabase:', error.message);
        } catch (err) {
          console.warn('[useCatalog] Falha de conexão ao rejeitar lote:', err);
        }
      }
    }, []),
    batchApprovePending: useCallback(
      async (items: (string | { id: string; affiliateUrl?: string })[]) => {
        const urlMap = new Map<string, string>();
        const ids: string[] = [];
        for (const item of items) {
          if (typeof item === 'string') {
            ids.push(item);
          } else {
            ids.push(item.id);
            if (item.affiliateUrl) {
              urlMap.set(item.id, item.affiliateUrl);
            }
          }
        }

        const set = new Set(ids);
        const toApprove = pendingProducts.filter((p) => set.has(p.id));
        if (toApprove.length === 0) return;

        const approvedItems: AffiliateProduct[] = toApprove.map((p) => ({
          ...p,
          affiliateUrl: urlMap.get(p.id) || p.affiliateUrl,
          active: true,
          status: 'ativo',
          lojaSlug: isClarice ? p.lojaSlug || 'clarice' : activeSlug,
        }));

        setPendingProducts((prev) => prev.filter((p) => !set.has(p.id)));
        setProducts((prev) => [...approvedItems, ...prev]);

        if (isSupabaseConfigured) {
          try {
            for (const item of approvedItems) {
              await supabase
                .from('produtos_clarice')
                .update({
                  active: true,
                  status: 'ativo',
                  affiliate_url: item.affiliateUrl,
                })
                .eq('id', item.id);
            }
          } catch (err) {
            console.warn('[useCatalog] Falha de conexão ao aprovar lote:', err);
          }
        }
      },
      [pendingProducts, isClarice, activeSlug]
    ),
    toggleFeatured: useCallback((id: string) => {
      setProducts((p) => p.map((x) => (x.id === id ? { ...x, featured: !x.featured } : x)));
    }, []),
    toggleFavorite: useCallback((id: string) => {
      setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    }, []),
    reset: useCallback(() => {
      setProducts([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storeKey);
      }
    }, [storeKey]),
  };
}
