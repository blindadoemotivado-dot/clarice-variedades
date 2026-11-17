import { useCallback, useEffect, useState } from 'react';
import type { AffiliateProduct } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

const KEY = 'zizi:catalog:v1';
const FAV_KEY = 'zizi:favorites:v1';

function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

export function useCatalog() {
  const [products, setProducts] = useState<AffiliateProduct[]>(MOCK_PRODUCTS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setProducts(read(KEY, MOCK_PRODUCTS)); setFavorites(read(FAV_KEY, [])); setLoaded(true); }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(products)); }, [products, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }, [favorites, loaded]);

  return {
    products, favorites,
    add: useCallback((items: AffiliateProduct[]) => setProducts((p) => [...items, ...p]), []),
    remove: useCallback((id: string) => setProducts((p) => p.filter((x) => x.id !== id)), []),
    toggleFeatured: useCallback((id: string) => setProducts((p) => p.map((x) => (x.id === id ? { ...x, featured: !x.featured } : x))), []),
    toggleFavorite: useCallback((id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])), []),
    reset: useCallback(() => setProducts(MOCK_PRODUCTS), []),
  };
}
