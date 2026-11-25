import { describe, expect, it, vi } from 'vitest';
import {
  extractShopeeItemId,
  buildShopeeAuthHeader,
  fetchShopeeProductOffer,
} from './shopeeOpenApi';

describe('shopeeOpenApi', () => {
  describe('extractShopeeItemId', () => {
    it('extracts itemId from standard Shopee product URL', () => {
      const url =
        'https://shopee.com.br/Beliche-Casinha-100-Mdf-i.1215229492.22894416890';
      expect(extractShopeeItemId(url)).toBe('22894416890');
    });

    it('extracts itemId from opaanlp redirected URL', () => {
      const url =
        'https://shopee.com.br/opaanlp/1215229492/22894416890?__mobile__=1&exp_group=rollout';
      expect(extractShopeeItemId(url)).toBe('22894416890');
    });

    it('extracts itemId from /product/<shopId>/<itemId>', () => {
      const url = 'https://shopee.com.br/product/12345/99887766';
      expect(extractShopeeItemId(url)).toBe('99887766');
    });

    it('extracts itemId from query parameter', () => {
      const url = 'https://shopee.com.br/item?itemid=5544332211';
      expect(extractShopeeItemId(url)).toBe('5544332211');
    });

    it('returns null on invalid URL', () => {
      expect(extractShopeeItemId('https://google.com')).toBeNull();
      expect(extractShopeeItemId('')).toBeNull();
    });
  });

  describe('buildShopeeAuthHeader', () => {
    it('generates valid SHA-256 Authorization header with timestamp', () => {
      const appId = '18364201389';
      const secret = 'super_secret_shopee_key';
      const payload = JSON.stringify({ query: '{ test }' });
      const timestamp = 1732560000;

      const { authorization, timestamp: ts } = buildShopeeAuthHeader({
        appId,
        secret,
        payload,
        timestamp,
      });

      expect(ts).toBe(1732560000);
      expect(authorization).toContain('SHA256 Credential=18364201389');
      expect(authorization).toContain('Timestamp=1732560000');
      expect(authorization).toMatch(/Signature=[a-f0-9]{64}/);
    });
  });

  describe('fetchShopeeProductOffer', () => {
    it('parses successful GraphQL productOfferV2 response with prices and discount', async () => {
      const mockResponse = {
        data: {
          productOfferV2: {
            nodes: [
              {
                itemId: 22894416890,
                productName:
                  'Beliche Casinha Bela Com Coração 4 Janelas Venezianas',
                imageUrl:
                  'https://down-br.img.susercontent.com/file/sg-11134201-824g3-mesj6m631yit0a',
                priceMin: 2707.69,
                priceMax: 3500.0,
                priceDiscountRate: 22,
                offerLink: 'https://shopee.com.br/universal-link/...',
              },
            ],
          },
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const offer = await fetchShopeeProductOffer('22894416890', {
        appId: '18364201389',
        secret: 'shopee_key',
      });

      expect(offer).not.toBeNull();
      expect(offer?.title).toBe(
        'Beliche Casinha Bela Com Coração 4 Janelas Venezianas'
      );
      expect(offer?.currentPrice).toBe('2707,69');
      expect(offer?.originalPrice).toBe('3500,00');
      expect(offer?.imageUrl).toContain('susercontent.com');

      fetchSpy.mockRestore();
    });

    it('returns null when API returns error or empty nodes', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const offer = await fetchShopeeProductOffer('123', {
        appId: 'wrong_id',
        secret: 'wrong_secret',
      });

      expect(offer).toBeNull();
      fetchSpy.mockRestore();
    });
  });
});
