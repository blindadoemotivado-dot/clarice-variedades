import { describe, expect, it } from 'vitest';
import { extractProductMetadata } from './productMetadataServerFn';

describe('extractProductMetadata', () => {
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

  it('handles invalid or empty URLs safely without throwing', async () => {
    const res = await extractProductMetadata('');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
