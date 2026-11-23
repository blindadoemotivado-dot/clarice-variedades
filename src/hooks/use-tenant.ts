import { useEffect, useState } from 'react';
import { DEFAULT_CLARICE_STORE, type LojaAfiliado } from '@/types/tenant';
import { fetchStoreBySlug } from '@/services/tenantService';

export function useTenant() {
  const [store, setStore] = useState<LojaAfiliado>(DEFAULT_CLARICE_STORE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Detecta loja a partir do parâmetro ?loja= ou padrão 'clarice'
    let slug = 'clarice';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramSlug = params.get('loja')?.trim().toLowerCase();
      if (paramSlug) slug = paramSlug;
    }

    fetchStoreBySlug(slug)
      .then((res) => {
        if (active) {
          setStore(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setStore(DEFAULT_CLARICE_STORE);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const isSuspended =
    store.statusAssinatura === 'inadimplente' || store.statusAssinatura === 'suspenso';

  return {
    store,
    loading,
    isSuspended,
  };
}
