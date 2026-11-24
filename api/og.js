/**
 * Gerador Dinâmico de Open Graph Card PNG (1200x630) White-Label por Loja
 * Rota Serverless Vercel: /api/og?loja=<slug>
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateOgSvg({ nomeLoja, subtitulo, corPrimaria, corDestaque, isClarice }) {
  const safeNome = escapeXml(nomeLoja);
  const safeSubtitulo = escapeXml(
    subtitulo || 'Achadinhos exclusivos com desconto real e compra garantida'
  );
  const safeCorPrimaria = corPrimaria || '#0F172A';
  const safeCorDestaque = corDestaque || '#FFE600';

  return `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="50%" stop-color="${safeCorPrimaria}"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>

      <radialGradient id="glow" cx="80%" cy="20%" r="50%">
        <stop offset="0%" stop-color="${safeCorDestaque}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${safeCorDestaque}" stop-opacity="0"/>
      </radialGradient>
      
      <radialGradient id="glow2" cx="20%" cy="80%" r="60%">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
      </radialGradient>

      <linearGradient id="accentBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
    </defs>

    <!-- Fundo Principal com Gradiente Dark Premium -->
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect width="1200" height="630" fill="url(#glow2)"/>

    <!-- Moldura externa sutil -->
    <rect x="24" y="24" width="1152" height="582" rx="36" fill="none" stroke="url(#accentBorder)" stroke-width="2"/>

    <!-- Conteúdo do Card -->
    <g transform="translate(80, 80)">
      <!-- Selo Superior: Ofertas Verificadas • Mercado Livre & Shopee -->
      <g transform="translate(0, 0)">
        <rect width="470" height="46" rx="23" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <circle cx="26" cy="23" r="8" fill="#10B981"/>
        <text x="46" y="29" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#E2E8F0" letter-spacing="1">
          OFERTAS VERIFICADAS • MERCADO LIVRE &amp; SHOPEE
        </text>
      </g>

      <!-- Nome da Loja em Tipografia Destaque -->
      <text x="0" y="150" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="-1">
        ${safeNome}
      </text>

      <!-- Subtítulo / Chamada -->
      <text x="0" y="210" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="500" fill="#94A3B8">
        ${safeSubtitulo}
      </text>

      <!-- Badges Oficiais: Mercado Livre + Shopee + Desconto -->
      <g transform="translate(0, 280)">
        <!-- Badge Mercado Livre -->
        <g transform="translate(0, 0)">
          <rect width="230" height="56" rx="16" fill="#FFE600"/>
          <text x="115" y="35" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#0F172A" text-anchor="middle">
            MERCADO LIVRE
          </text>
        </g>

        <!-- Badge Shopee -->
        <g transform="translate(250, 0)">
          <rect width="180" height="56" rx="16" fill="#EE4D2D"/>
          <text x="90" y="35" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#FFFFFF" text-anchor="middle">
            SHOPEE
          </text>
        </g>

        <!-- Badge Economia / Frete Grátis -->
        <g transform="translate(450, 0)">
          <rect width="270" height="56" rx="16" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
          <text x="135" y="35" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#F8FAFC" text-anchor="middle">
            ⚡ ATÉ 70% OFF • COMPRA SEGURA
          </text>
        </g>
      </g>

      <!-- Rodapé Institucional -->
      <g transform="translate(0, 410)">
        <text x="0" y="20" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#64748B">
          Curadoria diária atualizada • Links oficiais com suporte garantido
        </text>
      </g>
    </g>
  </svg>
  `;
}

export default async function handler(req, res) {
  const isFetch = req && typeof req.headers?.get === 'function';
  let slug = 'clarice';

  if (isFetch) {
    try {
      const url = new URL(req.url);
      slug = (url.searchParams.get('loja') || 'clarice').trim().toLowerCase();
    } catch {
      slug = 'clarice';
    }
  } else {
    slug = (req?.query?.loja || 'clarice').trim().toLowerCase();
  }

  let nomeLoja = 'Clarice Achadinhos';
  let subtitulo = 'Curadoria diária de achadinhos no Mercado Livre e Shopee';
  let corPrimaria = '#0F172A';
  let corDestaque = '#FFE600';
  const isClarice = slug === 'clarice';

  if (!isClarice) {
    if (slug === 'entre-amigas-promos') {
      nomeLoja = 'Entre amigas promos';
    } else if (slug === 'loja-demo') {
      nomeLoja = 'Achadinhos Demo FCIA';
    } else {
      nomeLoja = slug.replace(/[-_]/g, ' ');
    }

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        const { data } = await supabase
          .from('lojas_afiliados')
          .select('nome_loja, subtitulo, cor_primaria, cor_destaque')
          .eq('slug', slug)
          .maybeSingle();

        if (data?.nome_loja) {
          nomeLoja = data.nome_loja;
          if (data.subtitulo) subtitulo = data.subtitulo;
          if (data.cor_primaria) corPrimaria = data.cor_primaria;
          if (data.cor_destaque) corDestaque = data.cor_destaque;
        }
      } catch (err) {
        console.warn('[OG Generator] Falha ao consultar Supabase:', err);
      }
    }
  }

  try {
    const svg = generateOgSvg({ nomeLoja, subtitulo, corPrimaria, corDestaque, isClarice });
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 8 })
      .toBuffer();

    if (isFetch) {
      return new Response(pngBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': pngBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
      });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', pngBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).send(pngBuffer);
  } catch (err) {
    console.error('[OG Generator] Erro ao gerar PNG:', err);
    if (isFetch) {
      return new Response('Erro ao gerar imagem OG', { status: 500 });
    }
    return res.status(500).send('Erro ao gerar imagem OG');
  }
}
