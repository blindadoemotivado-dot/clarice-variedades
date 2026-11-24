import { describe, it, expect } from 'vitest';
// @ts-expect-error JS import
import handler, { generateOgSvg } from '../../api/og.js';

describe('OG Generator (/api/og)', () => {
  it('deve gerar SVG customizado com nome da loja parceira e sem Clarice', () => {
    const svg = generateOgSvg({
      nomeLoja: 'Entre amigas promos',
      subtitulo: 'Ofertas reais com desconto',
      corPrimaria: '#0F172A',
      corDestaque: '#FFE600',
      isClarice: false,
    });

    expect(svg).toContain('Entre amigas promos');
    expect(svg).toContain('OFERTAS VERIFICADAS • MERCADO LIVRE &amp; SHOPEE');
    expect(svg).not.toContain('Clarice Achadinhos');
  });

  it('deve responder HTTP 200 e Content-Type image/png', async () => {
    const req = new Request('http://localhost:3000/api/og?loja=entre-amigas-promos');
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const cl = Number(res.headers.get('content-length'));
    expect(cl).toBeGreaterThan(1000);
  });
});
