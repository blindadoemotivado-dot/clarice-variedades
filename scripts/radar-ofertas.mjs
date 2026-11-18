import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

// 1. Carrega variáveis de ambiente de .env.local
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
const DEFAULT_AFFILIATE_TAG =
  process.env.ML_AFFILIATE_TAG || 'kd20250113073553';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// URLs alvo para varredura real de ofertas
const TARGET_URLS = [
  { url: 'https://www.mercadolivre.com.br/ofertas', name: 'Ofertas Principais' },
  { url: 'https://lista.mercadolivre.com.br/eletrodomesticos/ofertas', name: 'Eletroportáteis' },
  { url: 'https://lista.mercadolivre.com.br/casa-moveis-decoracao/ofertas', name: 'Casa & Cozinha' },
  { url: 'https://lista.mercadolivre.com.br/ferramentas/ofertas', name: 'Ferramentas' },
  { url: 'https://lista.mercadolivre.com.br/eletronicos-audio-video/ofertas', name: 'Eletrônicos' },
  { url: 'https://lista.mercadolivre.com.br/beleza-cuidado-pessoal/ofertas', name: 'Beleza & Saúde' },
];

function inferCategory(title) {
  const t = title.toLowerCase();
  if (/(tv|smartphone|celular|fone|bluetooth|notebook|tablet|alexa|smartwatch|som|caixa|gamer)/.test(t)) {
    return 'Eletrônicos';
  }
  if (/(cafeteira|panela|air fryer|frigideira|jogo de panelas|organizador|cozinha|copo|garrafa|pote)/.test(t)) {
    return 'Casa & Cozinha';
  }
  if (/(aspirador|ferro|ventilador|liquidificador|batedeira|micro-ondas|robo|sanduicheira)/.test(t)) {
    return 'Eletroportáteis';
  }
  if (/(furadeira|parafusadeira|serra|trena|chave|ferramenta|solda|alicate|bateria 20v)/.test(t)) {
    return 'Ferramentas';
  }
  if (/(secador|escova|perfume|hidratante|maquiagem|barba|cabelo|solar|skincare|alisadora)/.test(t)) {
    return 'Beleza & Saúde';
  }
  if (/(camiseta|tênis|tenis|sapato|calça|mochila|bolsa|relógio|carteira|jaqueta)/.test(t)) {
    return 'Moda & Acessórios';
  }
  return 'Achadinhos';
}

export async function scrapeOffersFromPage(page, targetUrl, minDiscount = 15) {
  console.log(`🌐 Acessando ofertas reais: ${targetUrl}`);
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Scroll para renderizar produtos dinâmicos
    await page.evaluate(() => window.scrollBy(0, 1600));
    await page.waitForTimeout(2000);

    const deals = await page.evaluate((minDisc) => {
      function parseBRL(str) {
        if (!str) return 0;
        const cleaned = str.replace(/[^\d.,]/g, '').trim();
        if (!cleaned) return 0;
        if (cleaned.includes('.') && cleaned.includes(',')) {
          return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        }
        if (cleaned.includes(',')) {
          return parseFloat(cleaned.replace(',', '.'));
        }
        if (cleaned.includes('.')) {
          const parts = cleaned.split('.');
          if (parts[1]?.length === 3) {
            return parseFloat(cleaned.replace(/\./g, ''));
          }
          return parseFloat(cleaned);
        }
        return parseFloat(cleaned);
      }

      const cards = Array.from(
        document.querySelectorAll(
          '.poly-card, .promotion-item, .ui-search-layout__item, [class*="poly-card"]'
        )
      );

      const items = [];
      const seenMlb = new Set();

      for (const card of cards) {
        const linkEl = card.querySelector('a[href*="MLB"]');
        if (!linkEl) continue;
        const href = linkEl.href;

        // Extrair MLB ID único
        let mlbId = null;
        const pMatch = href.match(/\/p\/(MLB\d+)/i);
        const idMatch = href.match(/(MLB-\d+)/i);
        const widMatch = href.match(/wid=(MLB\d+)/i);
        const rawMatch = href.match(/(MLB\d{6,})/i);

        if (pMatch) mlbId = pMatch[1];
        else if (idMatch) mlbId = idMatch[1];
        else if (widMatch) mlbId = widMatch[1];
        else if (rawMatch) mlbId = rawMatch[1];

        if (!mlbId) continue;
        if (!mlbId.startsWith('MLB-')) {
          mlbId = mlbId.replace(/^MLB/i, 'MLB-');
        }

        if (seenMlb.has(mlbId)) continue;

        // Título
        const titleEl = card.querySelector(
          '.poly-component__title, a.poly-component__title, .promotion-item__title, a[title]'
        );
        const title =
          titleEl?.textContent?.trim() ||
          titleEl?.getAttribute('title')?.trim() ||
          linkEl.textContent?.trim() ||
          '';
        if (!title || title.length < 5) continue;

        // Imagem HD
        const imgEl = card.querySelector('img');
        let imgUrl =
          imgEl?.getAttribute('src') ||
          imgEl?.getAttribute('data-src') ||
          imgEl?.src ||
          '';
        if (!imgUrl || imgUrl.startsWith('data:')) continue;
        imgUrl = imgUrl.replace('-I.jpg', '-O.jpg').replace('http://', 'https://');

        // Preços
        const prevPriceEl = card.querySelector(
          's .andes-money-amount__fraction, .andes-money-amount--previous .andes-money-amount__fraction, s.andes-money-amount'
        );
        const currentPriceEl = card.querySelector(
          '.poly-price__current .andes-money-amount__fraction, .andes-money-amount:not(.andes-money-amount--previous) .andes-money-amount__fraction'
        );
        const currentCentsEl = card.querySelector('.poly-price__current .andes-money-amount__cents');

        let originalPrice = parseBRL(prevPriceEl?.textContent);
        let currentPrice = parseBRL(currentPriceEl?.textContent);
        if (currentCentsEl) {
          const cents = parseFloat(currentCentsEl.textContent) / 100;
          currentPrice += cents;
        }

        if (!currentPrice || currentPrice <= 0) continue;

        // Desconto
        let discountPercent = 0;
        const discountEl = card.querySelector('.andes-money-amount__discount, [class*="discount"]');
        if (discountEl) {
          const discMatch = discountEl.textContent.match(/(\d+)%\s*OFF/i);
          if (discMatch) discountPercent = parseInt(discMatch[1], 10);
        }
        if (!discountPercent && originalPrice > currentPrice) {
          discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }

        // Filtro estrito: >= minDiscount (padrão 15% OFF)
        if (discountPercent < minDisc) continue;
        if (!originalPrice || originalPrice <= currentPrice) {
          originalPrice = Math.round((currentPrice / (1 - discountPercent / 100)) * 100) / 100;
        }

        // Filtro estrito: Frete Grátis
        const cardText = card.innerText.toLowerCase();
        const shippingEl = card.querySelector('.poly-component__shipping, [class*="shipping"]');
        const shippingText = (shippingEl?.textContent || '').toLowerCase();
        const hasFreeShipping =
          shippingText.includes('grátis') ||
          cardText.includes('chegará grátis') ||
          cardText.includes('frete grátis') ||
          cardText.includes('envio grátis');

        if (!hasFreeShipping) continue;

        // Parcelamento
        const installmentsEl = card.querySelector('.poly-price__installments, [class*="installments"]');
        const installmentsText = installmentsEl?.textContent?.trim() || 'À vista';

        const isFull = cardText.includes('full');

        seenMlb.add(mlbId);
        items.push({
          mlbId,
          title,
          originalPrice,
          currentPrice,
          discountPercent,
          installmentsText,
          imageUrl: imgUrl,
          freeShipping: true,
          isFull,
          rawLink: href.split('?')[0],
        });
      }

      return items;
    }, minDiscount);

    return deals;
  } catch (err) {
    console.warn(`⚠️ Erro ao varrer ${targetUrl}:`, err.message);
    return [];
  }
}

export async function runRadarCrawler({
  customTerm,
  minDiscount = 15,
  tag = DEFAULT_AFFILIATE_TAG,
  targetCount = 35,
} = {}) {
  console.log('📡 [Radar Clarice Achadinhos] Iniciando varredura com Microsoft Edge (Playwright)...');
  console.log(`🎯 Conectado ao Supabase: ${SUPABASE_URL}`);
  console.log(`🏷️ Tag de Afiliado padrão: ${tag}`);
  if (customTerm) console.log(`🔍 Termo de busca sob demanda: "${customTerm}"`);

  // 1. Deduplicação estrita: Bloquear duplicados APENAS contra itens atualmente 'ativo' ou 'pendente_afiliado'
  const { data: existingRows, error: fetchErr } = await supabase
    .from('produtos_clarice')
    .select('mlb_id')
    .or('active.eq.true,status.eq.pendente_afiliado,status.eq.ativo');

  if (fetchErr) {
    console.error('❌ Falha ao consultar produtos existentes no banco:', fetchErr.message);
    throw fetchErr;
  }

  const blockedMlbIds = new Set((existingRows || []).map((r) => r.mlb_id));
  console.log(`📦 Produtos ativos/pendentes no catálogo a proteger de duplicação: ${blockedMlbIds.size}`);

  // 2. Inicializar contexto persistente do Microsoft Edge
  const profileDir = path.resolve(process.cwd(), '.edge-ml-profile');
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());

  const collectedDeals = [];
  const seenInBatch = new Set();

  try {
    if (customTerm) {
      // Busca por termo específico sob demanda
      const termUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(customTerm)}/ofertas`;
      const deals = await scrapeOffersFromPage(page, termUrl, minDiscount);
      for (const d of deals) {
        if (!blockedMlbIds.has(d.mlbId) && !seenInBatch.has(d.mlbId)) {
          seenInBatch.add(d.mlbId);
          collectedDeals.push({ ...d, category: inferCategory(d.title) });
        }
      }
    } else {
      // Varredura por categorias reais até atingir 25 a 40 ofertas
      for (const target of TARGET_URLS) {
        if (collectedDeals.length >= targetCount) break;
        const deals = await scrapeOffersFromPage(page, target.url, minDiscount);
        for (const d of deals) {
          if (!blockedMlbIds.has(d.mlbId) && !seenInBatch.has(d.mlbId)) {
            seenInBatch.add(d.mlbId);
            collectedDeals.push({ ...d, category: inferCategory(d.title) });
            if (collectedDeals.length >= targetCount) break;
          }
        }
        console.log(`✨ Ofertas únicas acumuladas até agora: ${collectedDeals.length}`);
      }
    }
  } finally {
    await context.close().catch(() => {});
  }

  console.log(`\n🔍 Total de ofertas qualificadas capturadas: ${collectedDeals.length}`);

  if (collectedDeals.length === 0) {
    console.log('✅ Nenhuma oferta nova para inserir (as ofertas garimpadas já constam na fila/catálogo).');
    return [];
  }

  // 3. Montar registros para o Supabase com status 'pendente_afiliado'
  const rowsToInsert = collectedDeals.map((deal) => {
    const rawUrl = deal.rawLink || `https://produto.mercadolivre.com.br/${deal.mlbId}`;
    const affiliateUrl = `${rawUrl}?matt_tool=${tag}`;

    return {
      mlb_id: deal.mlbId,
      title: deal.title,
      original_price: deal.originalPrice,
      current_price: deal.currentPrice,
      discount_percent: deal.discountPercent,
      installments_text: deal.installmentsText,
      image_url: deal.imageUrl,
      affiliate_url: affiliateUrl,
      category: deal.category,
      badge_text: `Radar ${deal.discountPercent}% OFF`,
      free_shipping: deal.freeShipping,
      is_full: deal.isFull,
      rating: 4.8,
      reviews_count: 350,
      featured: false,
      active: false,
      status: 'pendente_afiliado',
    };
  });

  const { data: inserted, error: insertErr } = await supabase
    .from('produtos_clarice')
    .insert(rowsToInsert)
    .select('id, mlb_id, title, discount_percent, status');

  if (insertErr) {
    console.error('❌ Erro ao salvar ofertas no Supabase:', insertErr.message);
    throw insertErr;
  }

  console.log(`\n🎉 ${inserted.length} achadinhos reais salvos com sucesso na Fila do Radar (status: pendente_afiliado)!`);
  console.table(
    inserted.slice(0, 15).map((i) => ({
      MLB: i.mlb_id,
      Título: i.title.slice(0, 42) + '...',
      Desconto: `${i.discount_percent}% OFF`,
      Status: i.status,
    }))
  );
  if (inserted.length > 15) {
    console.log(`... e mais ${inserted.length - 15} ofertas inseridas no banco.`);
  }

  return inserted;
}

// Execução direta via CLI (node scripts/radar-ofertas.mjs [termoOpcional])
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const cliTerm = process.argv[2] || undefined;
  runRadarCrawler({ customTerm: cliTerm })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erro fatal na execução do radar:', err);
      process.exit(1);
    });
}
