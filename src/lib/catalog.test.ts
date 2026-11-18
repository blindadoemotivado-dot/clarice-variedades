import { describe, it, expect } from 'vitest';
import { extractMlbId, filterProducts, formatBRL, productFromUrl, buildWhatsAppCopy } from './catalog';
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
});
