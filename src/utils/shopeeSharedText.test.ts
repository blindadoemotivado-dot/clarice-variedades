import { describe, expect, it } from 'vitest';
import { parseShopeeSharedText } from './shopeeSharedText';

describe('parseShopeeSharedText', () => {
  it('parses standard Shopee share text with price and title', () => {
    const raw =
      'Confira [Beliche Casinha 100% Mdf Cama Auxiliar] por R$2.707,69! Encontre na Shopee agora! https://s.shopee.com.br/40iNZkIFU7';
    const result = parseShopeeSharedText(raw);

    expect(result).not.toBeNull();
    expect(result?.isSharedText).toBe(true);
    expect(result?.url).toBe('https://s.shopee.com.br/40iNZkIFU7');
    expect(result?.currentPrice).toBe('2.707,69');
    expect(result?.title).toBe('Beliche Casinha 100% Mdf Cama Auxiliar');
    expect(result?.marketplace).toBe('shopee');
  });

  it('parses Shopee share text with discount (De R$ X por R$ Y)', () => {
    const raw =
      'Confira Garrafa Térmica 1L De R$ 120,00 por R$ 89,90! Encontre na Shopee agora! https://shopee.com.br/product/123/456';
    const result = parseShopeeSharedText(raw);

    expect(result).not.toBeNull();
    expect(result?.url).toBe('https://shopee.com.br/product/123/456');
    expect(result?.originalPrice).toBe('120,00');
    expect(result?.currentPrice).toBe('89,90');
    expect(result?.marketplace).toBe('shopee');
  });

  it('handles clean standalone Shopee URL without extra text', () => {
    const raw = 'https://s.shopee.com.br/40iNZkIFU7';
    const result = parseShopeeSharedText(raw);

    expect(result).not.toBeNull();
    expect(result?.isSharedText).toBe(false);
    expect(result?.url).toBe('https://s.shopee.com.br/40iNZkIFU7');
    expect(result?.currentPrice).toBeUndefined();
    expect(result?.title).toBeUndefined();
  });

  it('handles Mercado Livre link safely', () => {
    const raw = 'Confira este produto https://mercadolivre.com/sec/24iX52A';
    const result = parseShopeeSharedText(raw);

    expect(result).not.toBeNull();
    expect(result?.url).toBe('https://mercadolivre.com/sec/24iX52A');
    expect(result?.marketplace).toBe('mercadolivre');
  });

  it('returns null on invalid or empty string', () => {
    expect(parseShopeeSharedText('')).toBeNull();
    expect(parseShopeeSharedText('texto sem url')).toBeNull();
  });
});
