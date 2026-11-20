import { describe, it, expect } from 'vitest';
import {
  extractMlbId,
  filterProducts,
  formatBRL,
  productFromUrl,
  buildWhatsAppCopy,
  normalizeTitle,
  calculateSimilarity,
  normalizeImageUrl,
} from './catalog';
import { isValidMercadoLivreUrl, isMonetizedUrl } from '@/components/store/AdminSheet';
import { applyAffiliateTag, getStoreSettings } from '@/lib/store-settings';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

const base = { query: '', category: 'Todos' as const, favoritesOnly: false, favorites: [], sort: 'relevance' as const };

describe('catalog', () => {
  it('formata em BRL', () => expect(formatBRL(279.9).replace(/\s/g, ' ')).toBe('R$ 279,90'));
  it('extrai MLB da URL', () => expect(extractMlbId('https://produto.mercadolivre.com.br/MLB-3491827-air-fryer')).toBe('MLB-3491827'));
  it('busca por código MLB', () => expect(filterProducts(MOCK_PRODUCTS, { ...base, query: 'mlb-9928172' })).toHaveLength(1));
  it('ordena por menor preço', () => expect(filterProducts(MOCK_PRODUCTS, { ...base, sort: 'price' })[0]?.currentPrice).toBe(199.9));
  it('filtra ofertas relâmpago', () => expect(filterProducts(MOCK_PRODUCTS, { ...base, category: 'Relâmpago' })).toHaveLength(2));
  it('gera produto a partir de URL', () => expect(productFromUrl('https://x.com/MLB-1234567-teste', 'Ferramentas')?.mlbId).toBe('MLB-1234567'));
  it('copy contém preço com desconto', () => expect(buildWhatsAppCopy(MOCK_PRODUCTS[0]!)).toContain('(35% OFF)'));
  it('valida links do Mercado Livre na trava de monetização', () => {
    expect(isValidMercadoLivreUrl('https://produto.mercadolivre.com.br/MLB-123')).toBe(true);
    expect(isValidMercadoLivreUrl('https://meli.la/12345')).toBe(true);
    expect(isValidMercadoLivreUrl('https://amazon.com.br/dp/123')).toBe(false);
    expect(isValidMercadoLivreUrl('')).toBe(false);
  });
  it('detecta URLs monetizadas com tag de afiliado', () => {
    expect(isMonetizedUrl('https://mercadolivre.com.br/p/MLB123?matt_tool=clarice')).toBe(true);
    expect(isMonetizedUrl('https://meli.la/abcde')).toBe(true);
    expect(isMonetizedUrl('https://produto.mercadolivre.com.br/MLB-123')).toBe(false);
  });
  it('aplica tag de afiliado configurada via applyAffiliateTag', () => {
    const url = 'https://produto.mercadolivre.com.br/MLB-123456';
    const monetized = applyAffiliateTag(url, 'clarice-achadinhos');
    expect(monetized).toContain('matt_tool=clarice-achadinhos');
    expect(getStoreSettings().mlAffiliateTag).toBe('clarice-achadinhos');
  });

  describe('deduplicação de títulos e similaridade', () => {
    it('normaliza títulos removendo acentos, pontuação e palavras genéricas', () => {
      const raw = 'Super Oferta! Fone de Ouvido Bluetooth Sem Fio Original Promoção - Frete Grátis';
      const normalized = normalizeTitle(raw);
      expect(normalized).toBe('fone de ouvido bluetooth sem fio');
    });

    it('trata strings vazias ou nulas na normalização', () => {
      expect(normalizeTitle('')).toBe('');
      expect(normalizeTitle('   ')).toBe('');
    });

    it('calcula similaridade de 100% para strings idênticas', () => {
      expect(calculateSimilarity('air fryer mondial 4l inox', 'air fryer mondial 4l inox')).toBe(1.0);
    });

    it('calcula similaridade >= 85% para variações mínimas do mesmo produto', () => {
      const title1 = normalizeTitle('Fritadeira Air Fryer Mondial 4L Inox 110V');
      const title2 = normalizeTitle('Fritadeira Air Fryer Mondial 4L Inox');
      const sim = calculateSimilarity(title1, title2);
      expect(sim).toBeGreaterThanOrEqual(0.85);
    });

    it('calcula similaridade baixa (< 60%) para produtos distintos de categorias diferentes', () => {
      const title1 = normalizeTitle('Fritadeira Air Fryer Mondial 4L Inox');
      const title2 = normalizeTitle('Andador Infantil Carrinho Passeio Bebe');
      const sim = calculateSimilarity(title1, title2);
      expect(sim).toBeLessThan(0.6);
    });

    it('normaliza URLs de imagem do Mercado Livre para extrair ID do asset', () => {
      const url1 = 'https://http2.mlstatic.com/D_NQ_NP_2X_813292-MLA74620358212_022024-F.webp';
      const url2 = 'https://http2.mlstatic.com/D_NQ_NP_813292-MLA74620358212_022024-O.webp?v=1';
      expect(normalizeImageUrl(url1)).toBe(normalizeImageUrl(url2));
      expect(normalizeImageUrl(url1)).toBe('813292-mla74620358212_022024');
    });
  });
});
