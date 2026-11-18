import { useCallback, useEffect, useState } from 'react';
import type { AffiliateProduct } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const KEY = 'clarice_v2';
const FAV_KEY = 'clarice:favorites:v1';
const LEGACY_FAV_KEY = 'zizi:favorites:v1';

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
  };
}

export function useCatalog() {
  const [products, setProducts] = useState<AffiliateProduct[]>(MOCK_PRODUCTS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 1. Carrega inicial do cache local ou produtos mockados
    const initialLocal = read<AffiliateProduct[]>(KEY, MOCK_PRODUCTS);
    setProducts(initialLocal.length > 0 ? initialLocal : MOCK_PRODUCTS);
    setFavorites(readWithLegacy(FAV_KEY, LEGACY_FAV_KEY, []));
    setLoaded(true);

    // 2. Conecta ao Supabase para carregar produtos_clarice caso configurado
    if (isSupabaseConfigured) {
      setIsSyncing(true);
      supabase
        .from('produtos_clarice')
        .select('*')
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const mapped = (data as SupabaseProductRow[]).map(mapRowToProduct);
            setProducts(mapped);
          } else if (error) {
            console.warn('[useCatalog] Aviso ao buscar produtos_clarice do Supabase, mantendo catálogo local/mock:', error.message);
          }
        })
        .catch((err) => {
          console.warn('[useCatalog] Conexão com Supabase indisponível, usando catálogo local/mock:', err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(products));
  }, [products, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites, loaded]);

  return {
    products,
    favorites,
    isSyncing,
    add: useCallback((items: AffiliateProduct[]) => {
      setProducts((p) => [...items, ...p]);
    }, []),
    remove: useCallback((id: string) => {
      setProducts((p) => p.filter((x) => x.id !== id));
    }, []),
    toggleFeatured: useCallback((id: string) => {
      setProducts((p) => p.map((x) => (x.id === id ? { ...x, featured: !x.featured } : x)));
    }, []),
    toggleFavorite: useCallback((id: string) => {
      setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    }, []),
    reset: useCallback(() => setProducts(MOCK_PRODUCTS), []),
  };
}
