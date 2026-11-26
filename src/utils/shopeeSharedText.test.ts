import { describe, expect, it } from 'vitest';
import { parseShopeeSharedText, normalizePrice } from './shopeeSharedText';

describe('normalizePrice', () => {
  it('normalizes various price formats to BRL standard', () => {
    expect(normalizePrice('34,90')).toBe('34,90');
    expect(normalizePrice('34.90')).toBe('34,90');
    expect(normalizePrice('34.9')).toBe('34,90');
    expect(normalizePrice('34,9')).toBe('34,90');
    expect(normalizePrice('34')).toBe('34,00');
    expect(normalizePrice('2.707,69')).toBe('2.707,69');
    expect(normalizePrice('2707.69')).toBe('2707,69');
    expect(normalizePrice('22594819679')).toBeUndefined(); // rejects large IDs
  });
});

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

  it('parses Shopee share text with dot decimals (R$34.90 and De R$59.90 por R$34.90)', () => {
    const raw1 = 'Kit 5 Balões Encapsulados por R$34.90 https://s.shopee.com.br/1qdtHEbiyo';
    const res1 = parseShopeeSharedText(raw1);
    expect(res1?.currentPrice).toBe('34,90');

    const raw2 = 'De R$59.90 por R$34.90 https://s.shopee.com.br/1qdtHEbiyo';
    const res2 = parseShopeeSharedText(raw2);
    expect(res2?.originalPrice).toBe('59,90');
    expect(res2?.currentPrice).toBe('34,90');
  });

  it('parses Shopee share text without literal R$ (por 34,90 and por 34.90)', () => {
    const raw1 = 'Kit 5 Balões Encapsulados por 34,90 https://s.shopee.com.br/1qdtHEbiyo';
    const res1 = parseShopeeSharedText(raw1);
    expect(res1?.currentPrice).toBe('34,90');

    const raw2 = 'Kit 5 Balões Encapsulados por 34.90 https://s.shopee.com.br/1qdtHEbiyo';
    const res2 = parseShopeeSharedText(raw2);
    expect(res2?.currentPrice).toBe('34,90');
  });

  it('parses integer price (por R$34)', () => {
    const raw = 'Kit 5 Balões Encapsulados por R$34 https://s.shopee.com.br/1qdtHEbiyo';
    const res = parseShopeeSharedText(raw);
    expect(res?.currentPrice).toBe('34,00');
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
