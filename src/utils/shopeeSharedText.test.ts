import { describe, expect, it } from 'vitest';
import {
  parseShopeeSharedText,
  normalizePrice,
  splitBatchTextIntoItems,
} from './shopeeSharedText';

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

  it('parses Mercado Livre shared text correctly without letting "por 72h" steal the price', () => {
    const raw =
      "Olha o que eu encontrei! L'oréal Paris Elseve Collagen Lifter Leave-in Sérum Capilar Para Cabelos Finos Injeção de Massa com Peptídeos de Colágeno Aumenta o Volume em 61% e Encorpa os Fios por 72h 100ml - R$ 32,99 no Mercado Livre. https://meli.la/11rvn3r";
    const res = parseShopeeSharedText(raw);

    expect(res).not.toBeNull();
    expect(res?.isSharedText).toBe(true);
    expect(res?.marketplace).toBe('mercadolivre');
    expect(res?.url).toBe('https://meli.la/11rvn3r');
    expect(res?.currentPrice).toBe('32,99');
    expect(res?.title).toContain("L'oréal Paris Elseve Collagen Lifter");
  });

  it('parses Mercado Livre shared text with "por R$ X"', () => {
    const raw =
      'Confira este produto no Mercado Livre: Óleo Capilar Pantene por R$ 18,75: https://meli.la/2kQveg4';
    const res = parseShopeeSharedText(raw);

    expect(res).not.toBeNull();
    expect(res?.isSharedText).toBe(true);
    expect(res?.marketplace).toBe('mercadolivre');
    expect(res?.url).toBe('https://meli.la/2kQveg4');
    expect(res?.currentPrice).toBe('18,75');
    expect(res?.title).toBe('Óleo Capilar Pantene');
  });

  it('handles clean standalone meli.la and Shopee URL without extra text', () => {
    const raw1 = 'https://s.shopee.com.br/40iNZkIFU7';
    const res1 = parseShopeeSharedText(raw1);
    expect(res1?.isSharedText).toBe(false);
    expect(res1?.url).toBe('https://s.shopee.com.br/40iNZkIFU7');
    expect(res1?.currentPrice).toBeUndefined();

    const raw2 = 'https://meli.la/11rvn3r';
    const res2 = parseShopeeSharedText(raw2);
    expect(res2?.isSharedText).toBe(false);
    expect(res2?.url).toBe('https://meli.la/11rvn3r');
    expect(res2?.marketplace).toBe('mercadolivre');
    expect(res2?.currentPrice).toBeUndefined();
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

describe('splitBatchTextIntoItems', () => {
  it('splits multi-line shared blocks keeping title, price and URL grouped', () => {
    const raw = `
Confira Beliche Casinha... por R$2.707,69!
Encontre na Shopee agora!
https://s.shopee.com.br/40iNZkIFU7

Olha o que eu encontrei! L'oréal Paris Elseve - R$ 32,99
https://meli.la/11rvn3r
`;
    const items = splitBatchTextIntoItems(raw);
    expect(items.length).toBe(2);
    expect(items[0].url).toBe('https://s.shopee.com.br/40iNZkIFU7');
    expect(items[0].rawText).toContain('2.707,69');
    expect(items[1].url).toBe('https://meli.la/11rvn3r');
    expect(items[1].rawText).toContain('32,99');
  });

  it('handles simple one-url-per-line correctly', () => {
    const raw = `https://meli.la/11rvn3r\nhttps://meli.la/2kQveg4`;
    const items = splitBatchTextIntoItems(raw);
    expect(items.length).toBe(2);
    expect(items[0].url).toBe('https://meli.la/11rvn3r');
    expect(items[1].url).toBe('https://meli.la/2kQveg4');
  });
});
