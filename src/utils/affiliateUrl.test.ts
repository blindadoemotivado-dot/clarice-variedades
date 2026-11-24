import { describe, expect, it } from 'vitest';
import { applyStoreAffiliateTracking } from './affiliateUrl';

describe('applyStoreAffiliateTracking', () => {
  const mockStore = {
    mlAffiliateTag: 'tatianemirianbernardoconcei',
    mlMattTool: '51555285',
    shopeeAffiliateId: '18318420060',
  };

  describe('Shopee', () => {
    it('injects shopeeAffiliateId into raw Shopee link without query params', () => {
      const raw = 'https://shopee.com.br/Tenis-Esportivo-Macio-i.123456.789012';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.network).toBe('shopee');
      expect(result.finalUrl).toBe(
        'https://shopee.com.br/Tenis-Esportivo-Macio-i.123456.789012?af_siteid=18318420060&utm_source=an_18318420060&utm_medium=affiliates'
      );
    });

    it('injects shopeeAffiliateId using & when Shopee link already has query params', () => {
      const raw = 'https://shopee.com.br/product-name-i.123.456?sp_atk=abcdef';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.network).toBe('shopee');
      expect(result.finalUrl).toBe(
        'https://shopee.com.br/product-name-i.123.456?sp_atk=abcdef&af_siteid=18318420060&utm_source=an_18318420060&utm_medium=affiliates'
      );
    });

    it('overwrites previous Shopee tracking with store affiliateId to avoid commission leakage', () => {
      const raw = 'https://shopee.com.br/product-i.1.2?af_siteid=999999&utm_source=an_999999';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.finalUrl).toBe(
        'https://shopee.com.br/product-i.1.2?af_siteid=18318420060&utm_source=an_18318420060&utm_medium=affiliates'
      );
    });

    it('preserves existing Shopee tracking if store has no shopeeAffiliateId', () => {
      const raw = 'https://shopee.com.br/product-i.1.2?af_siteid=999999&utm_source=an_999999';
      const result = applyStoreAffiliateTracking(raw, { mlAffiliateTag: 'test' });

      expect(result.tracked).toBe(true);
      expect(result.finalUrl).toBe(raw);
    });

    it('returns tracked: false if store has no shopeeAffiliateId configured', () => {
      const raw = 'https://shopee.com.br/product-i.1.2';
      const result = applyStoreAffiliateTracking(raw, { mlAffiliateTag: 'test' });

      expect(result.tracked).toBe(false);
      expect(result.finalUrl).toBe(raw);
    });
  });

  describe('Mercado Livre', () => {
    it('preserves meli.la short links intact with tracked: true', () => {
      const raw = 'https://meli.la/1LHuxqS';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.network).toBe('ml');
      expect(result.finalUrl).toBe('https://meli.la/1LHuxqS');
    });

    it('preserves /sec/ short/session links intact with tracked: true', () => {
      const raw = 'https://mercadolivre.com.br/sec/2a3b4c';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.network).toBe('ml');
      expect(result.finalUrl).toBe('https://mercadolivre.com.br/sec/2a3b4c');
    });

    it('injects both matt_word and matt_tool to long product links when not present', () => {
      const raw = 'https://produto.mercadolivre.com.br/MLB-12345678-tenis-esportivo-_JM';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.network).toBe('ml');
      expect(result.finalUrl).toBe(
        'https://produto.mercadolivre.com.br/MLB-12345678-tenis-esportivo-_JM?matt_word=tatianemirianbernardoconcei&matt_tool=51555285'
      );
    });

    it('injects both matt_word and matt_tool with & when long product link already has query params', () => {
      const raw = 'https://produto.mercadolivre.com.br/MLB-12345678?searchVariation=123';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.network).toBe('ml');
      expect(result.finalUrl).toBe(
        'https://produto.mercadolivre.com.br/MLB-12345678?searchVariation=123&matt_word=tatianemirianbernardoconcei&matt_tool=51555285'
      );
    });

    it('overwrites previous ML tracking with store matt_word and matt_tool to prevent commission leakage', () => {
      const raw =
        'https://produto.mercadolivre.com.br/MLB-12345678?matt_tool=456&matt_word=existente';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(true);
      expect(result.finalUrl).toBe(
        'https://produto.mercadolivre.com.br/MLB-12345678?matt_tool=51555285&matt_word=tatianemirianbernardoconcei'
      );
    });

    it('preserves long ML links if store has neither mlAffiliateTag nor mlMattTool', () => {
      const raw =
        'https://produto.mercadolivre.com.br/MLB-12345678?matt_tool=456&matt_word=existente';
      const result = applyStoreAffiliateTracking(raw, { shopeeAffiliateId: '123' });

      expect(result.tracked).toBe(true);
      expect(result.finalUrl).toBe(raw);
    });

    it('returns tracked: false for long ML links when store has no mlAffiliateTag and no mlMattTool', () => {
      const raw = 'https://produto.mercadolivre.com.br/MLB-12345678-tenis-_JM';
      const result = applyStoreAffiliateTracking(raw, { shopeeAffiliateId: '123' });

      expect(result.tracked).toBe(false);
      expect(result.finalUrl).toBe(raw);
    });
  });

  describe('Outros / Casos Extremos', () => {
    it('returns network: other and untracked for generic links', () => {
      const raw = 'https://exemplo.com.br/produto';
      const result = applyStoreAffiliateTracking(raw, mockStore);

      expect(result.tracked).toBe(false);
      expect(result.network).toBe('other');
      expect(result.finalUrl).toBe(raw);
    });

    it('handles empty or invalid strings safely', () => {
      expect(applyStoreAffiliateTracking('', mockStore)).toEqual({
        finalUrl: '',
        tracked: false,
        network: 'other',
      });
      // @ts-expect-error test null input
      expect(applyStoreAffiliateTracking(null, mockStore)).toEqual({
        finalUrl: '',
        tracked: false,
        network: 'other',
      });
    });
  });
});
