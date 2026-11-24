import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImageUrl } from './starterCatalogService';

describe('starterCatalogService - validateImageUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve rejeitar URLs vazias ou não-HTTP', async () => {
    expect(await validateImageUrl('')).toBe(false);
    expect(await validateImageUrl(undefined)).toBe(false);
    expect(await validateImageUrl('ftp://invalid.com/image.jpg')).toBe(false);
  });

  it('deve rejeitar URLs conhecidas de tracking pixel do ML (-O.webp)', async () => {
    const trackingPixelUrl = 'https://http2.mlstatic.com/D_NQ_NP_948666-MLB89394998242_082025-O.webp';
    expect(await validateImageUrl(trackingPixelUrl)).toBe(false);
  });

  it('deve aceitar imagem HTTP 200 com Content-Type image/webp via HEAD', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'image/webp',
        'content-length': '25000',
      }),
    });

    const result = await validateImageUrl('https://http2.mlstatic.com/D_Q_NP_2X_669216-CBT117392767750_102026-E.webp');
    expect(result).toBe(true);
  });

  it('deve fazer fallback para GET se HEAD retornar 405 Method Not Allowed', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 405,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '50000',
        }),
      });

    global.fetch = fetchMock;

    const result = await validateImageUrl('https://down-br.img.susercontent.com/file/sg-11134201-82588-ms2a4njxexvr7f');
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deve rejeitar respostas com Content-Type gif (placeholders vazios)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'image/gif',
        'content-length': '43',
      }),
    });

    const result = await validateImageUrl('https://example.com/tracking-pixel.gif');
    expect(result).toBe(false);
  });

  it('deve retornar false em caso de timeout ou erro de rede', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await validateImageUrl('https://http2.mlstatic.com/timeout.webp');
    expect(result).toBe(false);
  });
});
