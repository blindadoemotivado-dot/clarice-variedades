import { useEffect, useState } from 'react';
import { DEFAULT_CLARICE_STORE, type LojaAfiliado } from '@/types/tenant';
import { fetchStoreBySlug, fetchStoreByDomain } from '@/services/tenantService';

export function useTenant(preferredSlug?: string) {
  const [store, setStore] = useState<LojaAfiliado>(() => {
    const slug =
      preferredSlug ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('loja')?.trim().toLowerCase()
        : undefined);

    if (slug && slug !== 'clarice') {
      return {
        ...DEFAULT_CLARICE_STORE,
        id: `tenant-${slug}`,
        slug: slug,
        nomeLoja: slug === 'loja-demo' ? 'Achadinhos Demo FCIA' : '',
        subtitulo: '',
        corPrimaria: '#0F172A',
        corDestaque: slug === 'loja-demo' ? '#10B981' : '#FFE600',
        logoUrl: undefined,
        heroMascoteUrl: undefined,
        whatsappVipUrl: '',
        instagramUrl: '',
        plano: 'pro',
        statusAssinatura: 'ativo',
      };
    }
    return DEFAULT_CLARICE_STORE;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    const slug =
      preferredSlug ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('loja')?.trim().toLowerCase()
        : undefined);
    return Boolean(slug && slug !== 'clarice');
  });

  useEffect(() => {
    let active = true;

    async function resolveTenant() {
      // 1. Tentar resolver por parâmetro explícito ou ?loja=<slug>
      const targetSlug =
        preferredSlug ||
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('loja')?.trim().toLowerCase()
          : undefined);

      if (targetSlug && targetSlug !== 'clarice') {
        try {
          return await fetchStoreBySlug(targetSlug);
        } catch {
          return {
            ...DEFAULT_CLARICE_STORE,
            id: `tenant-${targetSlug}`,
            slug: targetSlug,
            nomeLoja: targetSlug === 'loja-demo' ? 'Achadinhos Demo FCIA' : targetSlug,
            logoUrl: undefined,
            heroMascoteUrl: undefined,
          };
        }
      }

      if (typeof window === 'undefined') {
        return DEFAULT_CLARICE_STORE;
      }

      const hostname = window.location.hostname.toLowerCase();
      const isInternalDomain =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.vercel.app') ||
        hostname.includes('lovableproject.com');

      // 2. Tentar resolver por domínio customizado primeiro (se não for domínio interno)
      if (!isInternalDomain) {
        try {
          const storeByDomain = await fetchStoreByDomain(hostname);
          if (storeByDomain) return storeByDomain;
        } catch {
          // segue para busca por slug
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
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [preferredSlug]);

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
