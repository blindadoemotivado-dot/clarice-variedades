import { describe, expect, it, vi } from 'vitest';
import { extractProductMetadata, decodeHtmlEntities } from './productMetadataServerFn';
import * as shopeeOpenApi from './shopeeOpenApi';

describe('extractProductMetadata', () => {
  it('decodes HTML entities correctly', () => {
    expect(decodeHtmlEntities('Oferta &quot;Especial&#34; 10&#43; &amp; Frete')).toBe(
      'Oferta "Especial" 10+ & Frete'
    );
    expect(decodeHtmlEntities('Beliche D&#39;Arte &lt;Premium&gt; &nbsp;')).toBe(
      "Beliche D'Arte <Premium>  "
    );
  });
  it('extracts real title and image from Shopee short link without fake fallbacks', async () => {
    const res = await extractProductMetadata('https://s.shopee.com.br/40iNZkIFU7');

    expect(res.success).toBe(true);
    expect(res.title).toBeDefined();
    expect(res.title?.toLowerCase()).toContain('beliche');
    expect(res.title).not.toBe('Oferta Shopee');

    // Never fills fake prices (79.90, 106.53, etc.)
    expect(res.currentPrice).toBeUndefined();
    expect(res.originalPrice).toBeUndefined();

    // Never uses unsplash
    if (res.imageUrl) {
      expect(res.imageUrl).not.toContain('unsplash.com');
      expect(res.imageUrl).toContain('susercontent.com');
    }

    // Must be marked as partial because price was not provided by Shopee anti-bot
    expect(res.partial).toBe(true);
    expect(res.marketplace).toBe('shopee');
  }, 15000);

  it('preserves currentPrice and originalPrice when passed from clipboard shared text', async () => {
    const res = await extractProductMetadata('https://s.shopee.com.br/40iNZkIFU7', {
      preservedCurrentPrice: '2.707,69',
      preservedOriginalPrice: '3.500,00',
    });

    expect(res.success).toBe(true);
    expect(res.currentPrice).toBe('2.707,69');
    expect(res.originalPrice).toBe('3.500,00');
    // If image was also fetched, partial should be false
    if (res.imageUrl) {
      expect(res.partial).toBe(false);
    }
  }, 15000);

  it('uses Shopee Open API when credentials are provided', async () => {
    const mockOffer: shopeeOpenApi.ShopeeProductOffer = {
      itemId: '22894416890',
      title: 'Beliche Casinha Oficial Shopee API',
      imageUrl: 'https://down-br.img.susercontent.com/file/sg-fake-image',
      currentPrice: '2707,69',
      originalPrice: '3500,00',
    };

    const spy = vi
      .spyOn(shopeeOpenApi, 'fetchShopeeProductOffer')
      .mockResolvedValueOnce(mockOffer);

    const res = await extractProductMetadata('https://s.shopee.com.br/40iNZkIFU7', {
      shopeeAppId: '18364201389',
      shopeeSecret: 'my_secret_key',
    });

    expect(res.success).toBe(true);
    expect(res.title).toBe('Beliche Casinha Oficial Shopee API');
    expect(res.currentPrice).toBe('2707,69');
    expect(res.originalPrice).toBe('3500,00');
    expect(res.partial).toBe(false);

    spy.mockRestore();
  });

  it('extracts real price and title from Mercado Livre meli.la short link', async () => {
    const res = await extractProductMetadata('https://meli.la/11rvn3r');

    expect(res.success).toBe(true);
    expect(res.marketplace).toBe('mercadolivre');
    expect(res.title).toContain("Elseve Collagen Lifter");
    expect(parseFloat(res.currentPrice!.replace(',', '.'))).toBeGreaterThan(20);
    expect(parseFloat(res.originalPrice!.replace(',', '.'))).toBeGreaterThan(50);
    expect(res.imageUrl).toBeDefined();
    expect(res.imageUrl).toContain('mlstatic.com');
    expect(res.partial).toBe(false);
  }, 15000);

  it('handles invalid or empty URLs safely without throwing', async () => {
    const res = await extractProductMetadata('');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
