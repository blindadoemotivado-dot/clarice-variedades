import { useCallback, useEffect, useState } from 'react';
import type { AffiliateProduct } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { syncRadarOffersServerFn, type RadarSyncResult } from '@/services/radarServerFn';

const KEY = 'clarice_v2';
const FAV_KEY = 'clarice:favorites:v1';
const LEGACY_FAV_KEY = 'zizi:favorites:v1';
const DEMO_MLB_IDS = new Set(MOCK_PRODUCTS.map((p) => p.mlbId));

function read<T>(key: string, fallback: T): T {
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
}

function mapRowToProduct(row: SupabaseProductRow): AffiliateProduct {
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
  };
}

export function useCatalog() {
  const [products, setProducts] = useState<AffiliateProduct[]>(MOCK_PRODUCTS);
  const [pendingProducts, setPendingProducts] = useState<AffiliateProduct[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const [activeRes, pendingRes] = await Promise.all([
        supabase
          .from('produtos_clarice')
          .select('*')
          .eq('active', true)
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('produtos_clarice')
          .select('*')
          .eq('status', 'pendente_afiliado')
          .order('created_at', { ascending: false }),
      ]);

      if (!activeRes.error && activeRes.data && activeRes.data.length > 0) {
        setProducts((activeRes.data as SupabaseProductRow[]).map(mapRowToProduct));
      } else if (activeRes.error) {
        console.warn('[useCatalog] Aviso ao buscar produtos ativos:', activeRes.error.message);
      }

      if (!pendingRes.error && pendingRes.data) {
        setPendingProducts((pendingRes.data as SupabaseProductRow[]).map(mapRowToProduct));
      } else if (pendingRes.error) {
        console.warn('[useCatalog] Aviso ao buscar produtos pendentes:', pendingRes.error.message);
      }
    } catch (err) {
      console.warn('[useCatalog] Conexão com Supabase indisponível, usando catálogo local/mock:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Carrega inicial do cache local ou produtos mockados
    const initialLocal = read<AffiliateProduct[]>(KEY, MOCK_PRODUCTS);
    setProducts(initialLocal.length > 0 ? initialLocal : MOCK_PRODUCTS);
    setFavorites(readWithLegacy(FAV_KEY, LEGACY_FAV_KEY, []));
    setLoaded(true);

    // 2. Conecta ao Supabase para carregar produtos_clarice caso configurado
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(products));
  }, [products, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites, loaded]);

  const approveProduct = useCallback(async (id: string, customAffiliateUrl?: string) => {
    const target = pendingProducts.find((p) => p.id === id);
    if (!target) return;

    const finalUrl = customAffiliateUrl?.trim() || target.affiliateUrl;
    const approvedProduct: AffiliateProduct = {
      ...target,
      affiliateUrl: finalUrl,
      status: 'ativo',
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
  }, [pendingProducts]);

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

  const syncRadar = useCallback(async (customTag?: string): Promise<RadarSyncResult> => {
    setIsSyncing(true);
    try {
      let serverRes: RadarSyncResult = {
        success: true,
        newDealsCount: 0,
        totalPendingCount: pendingProducts.length,
        message: 'Radar atualizado.',
      };

      try {
        const res = await syncRadarOffersServerFn({ data: { tag: customTag } });
        if (res) serverRes = res;
      } catch (err) {
        console.warn('[useCatalog] Server function error, fallback to local fetch:', err);
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('produtos_clarice')
          .select('*')
          .eq('status', 'pendente_afiliado')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = (data as SupabaseProductRow[]).map(mapRowToProduct);
          setPendingProducts(mapped);
          return {
            ...serverRes,
            totalPendingCount: mapped.length,
          };
        }
      }

      return serverRes;
    } finally {
      setIsSyncing(false);
    }
  }, [pendingProducts.length]);

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
    add: useCallback((items: AffiliateProduct[]) => {
      setProducts((p) => [...items, ...p]);
    }, []),
    remove: useCallback((id: string) => {
      setProducts((p) => p.filter((x) => x.id !== id));
      if (isSupabaseConfigured) {
        supabase
          .from('produtos_clarice')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.warn('[useCatalog] Erro ao remover do Supabase:', error.message);
          });
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
          const { error } = await supabase
            .from('produtos_clarice')
            .delete()
            .eq('active', true);
          if (error) console.warn('[useCatalog] Erro ao esvaziar catálogo:', error.message);
        } catch (err) {
          console.warn('[useCatalog] Falha de conexão ao esvaziar catálogo:', err);
        }
      }
    }, []),
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
    batchApprovePending: useCallback(async (ids: string[]) => {
      const set = new Set(ids);
      const toApprove = pendingProducts.filter((p) => set.has(p.id));
      if (toApprove.length === 0) return;

      const approvedItems: AffiliateProduct[] = toApprove.map((p) => ({
        ...p,
        active: true,
        status: 'ativo',
      }));

      setPendingProducts((prev) => prev.filter((p) => !set.has(p.id)));
      setProducts((prev) => [...approvedItems, ...prev]);

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('produtos_clarice')
            .update({ active: true, status: 'ativo' })
            .in('id', ids);
          if (error) console.warn('[useCatalog] Erro ao aprovar lote no Supabase:', error.message);
        } catch (err) {
          console.warn('[useCatalog] Falha de conexão ao aprovar lote:', err);
        }
      }
    }, [pendingProducts]),
    toggleFeatured: useCallback((id: string) => {
      setProducts((p) => p.map((x) => (x.id === id ? { ...x, featured: !x.featured } : x)));
    }, []),
    toggleFavorite: useCallback((id: string) => {
      setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    }, []),
    reset: useCallback(() => setProducts(MOCK_PRODUCTS), []),
  };
}
