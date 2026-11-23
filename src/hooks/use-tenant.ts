import { useEffect, useState } from 'react';
import { DEFAULT_CLARICE_STORE, type LojaAfiliado } from '@/types/tenant';
import { fetchStoreBySlug, fetchStoreByDomain } from '@/services/tenantService';

export function useTenant() {
  const [store, setStore] = useState<LojaAfiliado>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramSlug = params.get('loja')?.trim().toLowerCase();
      if (paramSlug && paramSlug !== 'clarice') {
        return {
          ...DEFAULT_CLARICE_STORE,
          id: `tenant-${paramSlug}`,
          slug: paramSlug,
          nomeLoja: paramSlug === 'loja-demo' ? 'Achadinhos Demo FCIA' : paramSlug,
          logoUrl: undefined,
          heroMascoteUrl: undefined,
        };
      }
    }
    return DEFAULT_CLARICE_STORE;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function resolveTenant() {
      if (typeof window === 'undefined') {
        return DEFAULT_CLARICE_STORE;
      }

      const hostname = window.location.hostname.toLowerCase();
      const isInternalDomain =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.vercel.app') ||
        hostname.includes('lovableproject.com');

      // 1. Tentar resolver por domínio customizado primeiro (se não for domínio interno)
      if (!isInternalDomain) {
        try {
          const storeByDomain = await fetchStoreByDomain(hostname);
          if (storeByDomain) return storeByDomain;
        } catch {
          // segue para busca por slug
        }
      }

      // 2. Tentar resolver por parâmetro ?loja=<slug>
      const params = new URLSearchParams(window.location.search);
      const paramSlug = params.get('loja')?.trim().toLowerCase();
      if (paramSlug) {
        try {
          return await fetchStoreBySlug(paramSlug);
        } catch {
          return DEFAULT_CLARICE_STORE;
        }
      }

      // 3. Padrão: Loja oficial 'clarice'
      return await fetchStoreBySlug('clarice');
    }

    resolveTenant()
      .then((resolved) => {
        if (active) {
          setStore(resolved);
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

  // Trava de Assinatura:
  // Se for a loja oficial 'clarice', nunca é bloqueada.
  // Se for lojista assinante, bloqueia se status for inadimplente/suspenso
  // OU se vencimento_em estiver vencido há mais de 3 dias de tolerância.
  const isSuspended = (() => {
    if (store.slug === 'clarice') return false;

    if (store.statusAssinatura === 'inadimplente' || store.statusAssinatura === 'suspenso') {
      return true;
    }

    if (store.vencimentoEm) {
      const dueDate = new Date(store.vencimentoEm).getTime();
      const gracePeriodMs = 3 * 24 * 60 * 60 * 1000; // 3 dias de tolerância
      if (!isNaN(dueDate) && dueDate + gracePeriodMs < Date.now()) {
        return true;
      }
    }

    return false;
  })();

  return {
    store,
    loading,
    isSuspended,
  };
}
