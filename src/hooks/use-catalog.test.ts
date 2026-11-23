import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCatalog } from './use-catalog';
import type { AffiliateProduct } from '@/types/product';

const MOCK_CLARICE_PRODUCT: AffiliateProduct = {
  id: 'clarice-prod-1',
  mlbId: 'MLB-111111',
  title: 'Produto Oficial da Loja Clarice',
  originalPrice: 199.9,
  currentPrice: 99.9,
  discountPercent: 50,
  installmentsText: 'em 3x sem juros',
  imageUrl: 'https://example.com/clarice.jpg',
  affiliateUrl: 'https://mercadolivre.com/sec/clarice-afiliado',
  category: 'Casa & Cozinha',
  freeShipping: true,
  isFull: true,
  rating: 4.9,
  reviewsCount: 150,
  featured: true,
  lojaSlug: 'clarice',
};

const MOCK_DEMO_PRODUCT: AffiliateProduct = {
  id: 'demo-prod-1',
  mlbId: 'MLB-DEMO-001',
  title: 'Produto Exclusivo da Loja Demo',
  originalPrice: 299.9,
  currentPrice: 149.9,
  discountPercent: 50,
  installmentsText: 'em 6x sem juros',
  imageUrl: 'https://example.com/demo.jpg',
  affiliateUrl: 'https://mercadolivre.com/sec/demo-afiliado',
  category: 'Eletroportáteis',
  freeShipping: true,
  isFull: false,
  rating: 4.8,
  reviewsCount: 42,
  featured: false,
  lojaSlug: 'loja-demo',
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCatalog — Isolamento Estrito Multi-Tenant', () => {
  it('retorna catálogo vazio [] para loja-demo quando não há produtos e NUNCA vaza produtos da clarice', async () => {
    // Simula cache global da Clarice já populado no navegador
    localStorage.setItem('clarice_v2', JSON.stringify([MOCK_CLARICE_PRODUCT]));

    const { result } = renderHook(() => useCatalog('loja-demo'));

    // Para loja parceira 'loja-demo', deve ser estritamente vazio
    expect(result.current.products).toEqual([]);
    expect(result.current.products.some((p) => p.lojaSlug === 'clarice')).toBe(false);
    expect(result.current.products.some((p) => p.title.includes('Clarice'))).toBe(false);
  });

  it('não utiliza clarice_v2 como fallback para lojas parceiras mesmo com localStorage poluído', () => {
    localStorage.setItem('clarice_v2', JSON.stringify([MOCK_CLARICE_PRODUCT]));
    // Mesmo que o cache específico da loja esteja ausente
    expect(localStorage.getItem('clarice_catalog_cache_loja-demo')).toBeNull();

    const { result } = renderHook(() => useCatalog('loja-demo'));

    expect(result.current.products).toHaveLength(0);
  });

  it('isola o cache local por chave contendo o slug da loja parceira', async () => {
    // Popula o cache específico da loja-demo
    localStorage.setItem(
      'clarice_catalog_cache_loja-demo',
      JSON.stringify([MOCK_DEMO_PRODUCT])
    );
    // Popula o cache da clarice com outro produto
    localStorage.setItem('clarice_v2', JSON.stringify([MOCK_CLARICE_PRODUCT]));

    const { result } = renderHook(() => useCatalog('loja-demo'));

    // Deve carregar exclusivamente o produto da loja-demo
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].lojaSlug).toBe('loja-demo');
    expect(result.current.products[0].title).toBe('Produto Exclusivo da Loja Demo');
  });

  it('ao adicionar produtos para loja parceira, força a gravação do lojaSlug correto e salva no cache isolado', async () => {
    const { result } = renderHook(() => useCatalog('loja-demo'));

    act(() => {
      result.current.add([
        {
          id: 'novo-item-1',
          mlbId: 'MLB-999',
          title: 'Novo Item sem Slug Explícito',
          originalPrice: 100,
          currentPrice: 80,
          discountPercent: 20,
          installmentsText: 'À vista',
          imageUrl: 'https://example.com/item.jpg',
          affiliateUrl: 'https://mercadolivre.com',
          category: 'Casa & Cozinha',
          freeShipping: true,
          isFull: false,
          rating: 4.8,
          reviewsCount: 10,
          featured: false,
        },
      ]);
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].lojaSlug).toBe('loja-demo');

    // Verifica que clarice_v2 não foi afetado
    expect(localStorage.getItem('clarice_v2')).toBeNull();
  });

  it('permite que a loja oficial clarice leia seu cache padrão clarice_v2', () => {
    localStorage.setItem('clarice_v2', JSON.stringify([MOCK_CLARICE_PRODUCT]));

    const { result } = renderHook(() => useCatalog('clarice'));

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].title).toBe('Produto Oficial da Loja Clarice');
  });
});
