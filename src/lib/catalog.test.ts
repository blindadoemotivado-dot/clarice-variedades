import { describe, it, expect } from 'vitest';
import { extractMlbId, filterProducts, formatBRL, productFromUrl, buildWhatsAppCopy } from './catalog';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

const base = { query: '', category: 'Todos' as const, favoritesOnly: false, favorites: [], sort: 'relevance' as const };

describe('catalog', () => {
  it('formata em BRL', () => expect(formatBRL(279.9).replace(/\s/g, ' ')).toBe('R$ 279,90'));
  it('extrai MLB da URL', () => expect(extractMlbId('https://produto.mercadolivre.com.br/MLB-3491827-air-fryer')).toBe('MLB-3491827'));
  it('busca por código MLB', () => expect(filterProducts(MOCK_PRODUCTS, { ...base, query: 'mlb-9928172' })).toHaveLength(1));
  it('ordena por menor preço', () => expect(filterProducts(MOCK_PRODUCTS, { ...base, sort: 'price' })[0].currentPrice).toBe(199.9));
  it('filtra ofertas relâmpago', () => expect(filterProducts(MOCK_PRODUCTS, { ...base, category: 'Relâmpago' })).toHaveLength(2));
  it('gera produto a partir de URL', () => expect(productFromUrl('https://x.com/MLB-1234567-teste', 'Ferramentas')?.mlbId).toBe('MLB-1234567'));
  it('copy contém preço com desconto', () => expect(buildWhatsAppCopy(MOCK_PRODUCTS[0])).toContain('(35% OFF)'));
});
