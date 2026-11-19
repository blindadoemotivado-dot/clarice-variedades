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

// a) Infantil & Bebês 1+ ano (termos variados e rotativos)
const BABY_TARGETS = [
  { term: 'brinquedos educativos 1 ano', category: 'Infantil & Bebês' },
  { term: 'brinquedo montessori 1 ano', category: 'Infantil & Bebês' },
  { term: 'cadeira alimentacao bebe', category: 'Infantil & Bebês' },
  { term: 'copo transicao bebe', category: 'Infantil & Bebês' },
  { term: 'carrinho passeio bebe', category: 'Infantil & Bebês' },
  { term: 'fralda pampers confort sec', category: 'Infantil & Bebês' },
  { term: 'tenis bebe menina menino', category: 'Infantil & Bebês' },
  { term: 'andador infantil bebe', category: 'Infantil & Bebês' },
  { term: 'mordedor bebe sensorial', category: 'Infantil & Bebês' },
  { term: 'tapete atividades bebe infantil', category: 'Infantil & Bebês' },
  { term: 'prato termico infantil bebe', category: 'Infantil & Bebês' },
  { term: 'kit mamadeira anti colica', category: 'Infantil & Bebês' },
];

// b) Achadinhos Gerais de alta conversão (termos variados e rotativos)
const GENERAL_TARGETS = [
  { url: 'https://www.mercadolivre.com.br/ofertas', category: 'Ofertas do Dia' },
  { term: 'air fryer 4l', category: 'Casa & Cozinha' },
  { term: 'air fryer 5l', category: 'Casa & Cozinha' },
  { term: 'parafusadeira furadeira bateria', category: 'Ferramentas' },
  { term: 'jogo de ferramentas maleta', category: 'Ferramentas' },
  { term: 'fone bluetooth cancelamento ruido', category: 'Eletrônicos' },
  { term: 'caixa de som bluetooth prova d agua', category: 'Eletrônicos' },
  { term: 'panela eletrica de arroz', category: 'Eletroportáteis' },
  { term: 'aspirador robo', category: 'Eletroportáteis' },
  { term: 'aspirador de po vertical 2 em 1', category: 'Eletroportáteis' },
  { term: 'mop giratorio limpeza', category: 'Casa & Cozinha' },
  { term: 'escova secadora modeladora', category: 'Beleza & Saúde' },
  { term: 'cafeteira espresso eletrica', category: 'Eletroportáteis' },
  { term: 'organizador geladeira armarios', category: 'Casa & Cozinha' },
  { term: 'liquidificador potente 1000w', category: 'Eletroportáteis' },
];

// Embaralha array para garantir rotação dinâmica a cada execução
export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Constrói URLs paginadas (_Desde_49, _Desde_97) para cada alvo
export function buildPaginatedUrls(target) {
  if (target.url) {
    return [
      target.url,
      `${target.url}?page=2`,
      `${target.url}?page=3`,
    ];
  }
  const slug = encodeURIComponent(target.term).replace(/%20/g, '-');
  return [
    `https://lista.mercadolivre.com.br/${slug}/ofertas`,
    `https://lista.mercadolivre.com.br/${slug}/ofertas_Desde_49`,
    `https://lista.mercadolivre.com.br/${slug}/ofertas_Desde_97`,
  ];
}

/**
 * Normaliza títulos removendo acentos, pontuação e termos genéricos de promoção
 */
export function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(oferta|ofertas|promocao|promocoes|original|novo|nova|super|barato|imperdivel|frete|gratis|lancamento|top)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula a similaridade entre duas strings (0 a 1) combinando Dice Bigrams e Token Jaccard
 */
export function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const tokens1 = new Set(str1.split(' ').filter(Boolean));
  const tokens2 = new Set(str2.split(' ').filter(Boolean));
  let tokenIntersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) tokenIntersection++;
  }
  const totalTokens = tokens1.size + tokens2.size;
  const tokenSimilarity = totalTokens > 0 ? (2 * tokenIntersection) / totalTokens : 0;

  const bigrams1 = new Map();
  for (let i = 0; i < str1.length - 1; i++) {
    const bigram = str1.slice(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < str2.length - 1; i++) {
    const bigram = str2.slice(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  const totalBigrams = str1.length - 1 + (str2.length - 1);
  const bigramSimilarity = totalBigrams > 0 ? (2 * intersection) / totalBigrams : 0;

  return Math.max(bigramSimilarity, tokenSimilarity);
}

/**
 * Localiza possível correspondência duplicada no catálogo existente
 * (por MLB ID idêntico, título normalizado exato ou similaridade >= 85%)
 */
export function findDuplicateMatch(deal, existingProducts) {
  const dealNorm = normalizeTitle(deal.title);

  // 1. Prioridade: mesmo MLB ID
  for (const existing of existingProducts) {
    if (existing.mlbId && deal.mlbId && existing.mlbId === deal.mlbId) {
      return { match: existing, reason: 'mlb_id', similarity: 1.0 };
    }
  }

  // 2. Título normalizado exato ou similaridade >= 0.85
  if (!dealNorm) return null;

  let bestMatch = null;
  let highestSim = 0;

  for (const existing of existingProducts) {
    if (!existing.normTitle) continue;

    if (dealNorm === existing.normTitle) {
      return { match: existing, reason: 'exact_title', similarity: 1.0 };
    }

    const sim = calculateSimilarity(dealNorm, existing.normTitle);
    if (sim >= 0.85 && sim > highestSim) {
      highestSim = sim;
      bestMatch = existing;
    }
  }

  if (bestMatch) {
    return { match: bestMatch, reason: 'similarity', similarity: highestSim };
  }

  return null;
}

export function inferCategory(title, defaultCategory = 'Achadinhos') {
  const t = title.toLowerCase();
  if (
    defaultCategory === 'Infantil & Bebês' ||
    /(brinquedo|montessori|bebê|bebe|infantil|alimentacao|mamadeira|fralda|carrinho|chupeta|berço|berco|copo transicao|mordedor|andador|maternidade)/.test(t)
  ) {
    return 'Infantil & Bebês';
  }
  if (/(furadeira|parafusadeira|serra|trena|chave|ferramenta|solda|alicate|bateria 20v)/.test(t)) {
    return 'Ferramentas';
  }
  if (/(tv|smartphone|celular|fone|bluetooth|notebook|tablet|alexa|smartwatch|som|caixa|gamer)/.test(t)) {
    return 'Eletrônicos';
  }
  if (/(aspirador|ferro|ventilador|liquidificador|batedeira|micro-ondas|robo|sanduicheira|panela eletrica)/.test(t)) {
    return 'Eletroportáteis';
  }
  if (/(cafeteira|panela|air fryer|frigideira|jogo de panelas|organizador|cozinha|copo|garrafa|pote)/.test(t)) {
    return 'Casa & Cozinha';
  }
  if (/(secador|escova|perfume|hidratante|maquiagem|barba|cabelo|solar|skincare|alisadora)/.test(t)) {
    return 'Beleza & Saúde';
  }
  return defaultCategory === 'Ofertas do Dia' ? 'Casa & Cozinha' : defaultCategory;
}

export async function scrapeOffersFromPage(page, targetUrl, minDiscount = 15) {
  console.log(`🌐 Acessando ofertas reais: ${targetUrl}`);
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Scroll para carregar dinamicamente mais cards
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
        // Encontrar links de anúncio de produto estritamente válidos (bloqueando mlstatic.com e imagens)
        const candidateLinks = Array.from(card.querySelectorAll('a[href]'));
        let linkEl = null;
        let mlbId = null;

        for (const a of candidateLinks) {
          const h = (a.getAttribute('href') || a.href || '').trim();
          // Bloquear estritamente qualquer URL de imagem ou estática
          if (!h || h.includes('mlstatic.com') || /\.(webp|jpg|jpeg|png|gif)($|\?)/i.test(h)) {
            continue;
          }
          if (
            (h.includes('mercadolivre.com.br') || h.startsWith('/') || h.startsWith('http')) &&
            (h.includes('MLB') || h.includes('/p/MLB') || h.includes('wid=MLB'))
          ) {
            const pMatch = h.match(/\/p\/(MLB\d+)/i);
            const idMatch = h.match(/(MLB-?\d{6,})/i);
            const widMatch = h.match(/wid=(MLB\d+)/i);
            const rawMatch = h.match(/(MLB\d{6,})/i);

            if (pMatch) mlbId = pMatch[1];
            else if (idMatch) mlbId = idMatch[1];
            else if (widMatch) mlbId = widMatch[1];
            else if (rawMatch) mlbId = rawMatch[1];

            if (mlbId) {
              const digits = mlbId.replace(/\D/g, '');
              if (digits.length >= 6) {
                mlbId = `MLB-${digits}`;
                linkEl = a;
                break;
              }
            }
          }
        }

        if (!linkEl || !mlbId || seenMlb.has(mlbId)) continue;

        // URL real do produto preservando formato original (/p/MLB... ou produto.mercadolivre.com.br/MLB-...)
        const titleAnchor = card.querySelector('a.poly-component__title, .poly-component__title a, a[title]');
        const mainA = titleAnchor || linkEl;
        let rawHref = (mainA?.getAttribute('href') || mainA?.href || '').trim();
        if (!rawHref) continue;

        let cleanUrl = rawHref.split('?')[0].split('#')[0];
        if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
        else if (cleanUrl.startsWith('/')) cleanUrl = 'https://www.mercadolivre.com.br' + cleanUrl;

        // Validação estrita: rejeita CDN, imagens ou URLs fora do Mercado Livre
        if (
          !cleanUrl.includes('mercadolivre.com.br') ||
          cleanUrl.includes('mlstatic.com') ||
          /\.(webp|jpg|jpeg|png|gif)($|\?)/i.test(cleanUrl)
        ) {
          continue;
        }

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
          cleanUrl,
          title,
          originalPrice,
          currentPrice,
          discountPercent,
          installmentsText,
          imageUrl: imgUrl,
          freeShipping: true,
          isFull,
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
  targetCount = 36,
  existingPage = null,
} = {}) {
  console.log('📡 [Radar Clarice Achadinhos] Iniciando garimpo misto com Microsoft Edge...');
  console.log(`🎯 Supabase: ${SUPABASE_URL}`);
  console.log(`🏷️ Tag de Afiliado: ${tag}`);
  if (customTerm) console.log(`🔍 Garimpo sob demanda para: "${customTerm}"`);

  // 1. Deduplicação Global: consulta produtos existentes na tabela produtos_clarice
  const { data: existingRows, error: fetchErr } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, title, current_price, original_price, discount_percent, status, active');

  if (fetchErr) {
    console.error('❌ Falha ao consultar produtos existentes no banco:', fetchErr.message);
    throw fetchErr;
  }

  const existingProducts = (existingRows || []).map((r) => ({
    id: r.id,
    mlbId: r.mlb_id,
    title: r.title,
    normTitle: normalizeTitle(r.title),
    currentPrice: Number(r.current_price) || 0,
    originalPrice: Number(r.original_price) || 0,
    status: r.status,
    active: r.active,
  }));

  console.log(`📦 Deduplicação global ativada: ${existingProducts.length} produto(s) existentes no banco.`);

  // 2. Inicializar Edge Playwright com perfil persistente (ou reaproveitar se já fornecido)
  let context = null;
  let page = existingPage;
  const isSelfManaged = !existingPage;

  if (isSelfManaged) {
    const profileDir = path.resolve(process.cwd(), '.edge-ml-profile');
    context = await chromium.launchPersistentContext(profileDir, {
      channel: 'msedge',
      headless: false,
      viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled'],
    });
    page = context.pages()[0] || (await context.newPage());
  }

  const collectedDeals = [];
  const seenInBatch = new Set();

  try {
    if (customTerm) {
      // Garimpo sob demanda por termo livre com rotação de páginas
      const slug = encodeURIComponent(customTerm).replace(/%20/g, '-');
      const searchUrls = [
        `https://lista.mercadolivre.com.br/${slug}/ofertas`,
        `https://lista.mercadolivre.com.br/${slug}/ofertas_Desde_49`,
        `https://lista.mercadolivre.com.br/${slug}/ofertas_Desde_97`,
      ];
      for (const searchUrl of searchUrls) {
        if (collectedDeals.length >= targetCount) break;
        const deals = await scrapeOffersFromPage(page, searchUrl, minDiscount);
        for (const d of deals) {
          if (seenInBatch.has(d.mlbId)) continue;

          const dupCheck = findDuplicateMatch(d, existingProducts);
          if (dupCheck && dupCheck.match.currentPrice <= d.currentPrice) {
            continue;
          }

          seenInBatch.add(d.mlbId);
          collectedDeals.push({
            ...d,
            category: inferCategory(d.title, 'Achadinhos'),
          });
          if (collectedDeals.length >= targetCount) break;
        }
      }
    } else {
      // 2.A: Garimpo Infantil & Bebês 1+ ano (~18 itens) com rotação e paginação
      const babyTargetLimit = Math.floor(targetCount / 2);
      console.log(`\n🍼 [Grupo A] Garimpando achadinhos para Infantil & Bebês 1+ ano (meta: ${babyTargetLimit})...`);
      const rotatedBabyTargets = shuffleArray(BABY_TARGETS);
      for (const target of rotatedBabyTargets) {
        if (collectedDeals.length >= babyTargetLimit) break;
        const paginatedUrls = buildPaginatedUrls(target);
        for (const searchUrl of paginatedUrls) {
          if (collectedDeals.length >= babyTargetLimit) break;
          const deals = await scrapeOffersFromPage(page, searchUrl, minDiscount);
          for (const d of deals) {
            if (seenInBatch.has(d.mlbId)) continue;

            const dupCheck = findDuplicateMatch(d, existingProducts);
            if (dupCheck && dupCheck.match.currentPrice <= d.currentPrice) {
              continue;
            }

            seenInBatch.add(d.mlbId);
            collectedDeals.push({
              ...d,
              category: 'Infantil & Bebês',
            });
            if (collectedDeals.length >= babyTargetLimit) break;
          }
          if (collectedDeals.length >= babyTargetLimit) break;
        }
        console.log(`🍼 Achadinhos infantis inéditos acumulados: ${collectedDeals.length}`);
      }

      // 2.B: Garimpo Achadinhos Gerais de alta conversão (~18 itens) com rotação e paginação
      console.log(`\n⚡ [Grupo B] Garimpando achadinhos gerais de alta conversão (meta total: ${targetCount})...`);
      const rotatedGeneralTargets = shuffleArray(GENERAL_TARGETS);
      for (const target of rotatedGeneralTargets) {
        if (collectedDeals.length >= targetCount) break;
        const paginatedUrls = buildPaginatedUrls(target);
        for (const searchUrl of paginatedUrls) {
          if (collectedDeals.length >= targetCount) break;
          const deals = await scrapeOffersFromPage(page, searchUrl, minDiscount);
          for (const d of deals) {
            if (seenInBatch.has(d.mlbId)) continue;

            const dupCheck = findDuplicateMatch(d, existingProducts);
            if (dupCheck && dupCheck.match.currentPrice <= d.currentPrice) {
              continue;
            }

            seenInBatch.add(d.mlbId);
            collectedDeals.push({
              ...d,
              category: inferCategory(d.title, target.category),
            });
            if (collectedDeals.length >= targetCount) break;
          }
          if (collectedDeals.length >= targetCount) break;
        }
        console.log(`⚡ Total de achadinhos inéditos acumulados: ${collectedDeals.length}`);
      }
    }
  } finally {
    if (isSelfManaged && context) {
      await context.close().catch(() => {});
    }
  }

  console.log(`\n🔍 Total de ofertas qualificadas garimpadas no Mercado Livre: ${collectedDeals.length}`);

  if (collectedDeals.length === 0) {
    console.log('✅ Nenhuma oferta nova para inserir (todas as encontradas já constam na fila ou catálogo).');
    return [];
  }

  // 3. Persistência no Supabase com deduplicação por título e substituição por menor preço
  const validDeals = collectedDeals.filter((deal) => {
    const u = deal.cleanUrl || '';
    return (
      u.startsWith('https://') &&
      u.includes('mercadolivre.com.br') &&
      !u.includes('mlstatic.com') &&
      !/\.(webp|jpg|jpeg|png|gif)($|\?)/i.test(u)
    );
  });

  const rowsToInsert = [];
  let updatedCheaperCount = 0;
  let ignoredDuplicateCount = 0;

  for (const deal of validDeals) {
    const cleanUrl = deal.cleanUrl || `https://produto.mercadolivre.com.br/${deal.mlbId}`;
    const dupCheck = findDuplicateMatch(deal, existingProducts);

    if (dupCheck) {
      const existing = dupCheck.match;
      if (deal.currentPrice < existing.currentPrice) {
        console.log(
          `📉 [Substituição por Menor Preço] "${deal.title}" (R$ ${deal.currentPrice.toFixed(2)}) ` +
          `substitui "${existing.title}" (R$ ${existing.currentPrice.toFixed(2)}) [${(dupCheck.similarity * 100).toFixed(0)}% similar, motivo: ${dupCheck.reason}]`
        );

        const { error: updateErr } = await supabase
          .from('produtos_clarice')
          .update({
            mlb_id: deal.mlbId,
            title: deal.title,
            original_price: deal.originalPrice,
            current_price: deal.currentPrice,
            discount_percent: deal.discountPercent,
            installments_text: deal.installmentsText,
            image_url: deal.imageUrl,
            affiliate_url: cleanUrl,
            category: deal.category,
            badge_text: `Radar ${deal.discountPercent}% OFF`,
            free_shipping: deal.freeShipping,
            is_full: deal.isFull,
            status: 'pendente_afiliado',
            active: false,
          })
          .eq('id', existing.id);

        if (updateErr) {
          console.warn(`⚠️ Erro ao atualizar produto com menor preço (ID ${existing.id}):`, updateErr.message);
        } else {
          updatedCheaperCount++;
          existing.mlbId = deal.mlbId;
          existing.title = deal.title;
          existing.normTitle = normalizeTitle(deal.title);
          existing.currentPrice = deal.currentPrice;
        }
      } else {
        console.log(
          `⏩ [Duplicado Ignorado] Oferta garimpada R$ ${deal.currentPrice.toFixed(2)} >= Existente R$ ${existing.currentPrice.toFixed(2)} ` +
          `("${deal.title.slice(0, 35)}..." vs "${existing.title.slice(0, 35)}...")`
        );
        ignoredDuplicateCount++;
      }
    } else {
      // Produto inédito
      const newRow = {
        mlb_id: deal.mlbId,
        title: deal.title,
        original_price: deal.originalPrice,
        current_price: deal.currentPrice,
        discount_percent: deal.discountPercent,
        installments_text: deal.installmentsText,
        image_url: deal.imageUrl,
        affiliate_url: cleanUrl,
        category: deal.category,
        badge_text: `Radar ${deal.discountPercent}% OFF`,
        free_shipping: deal.freeShipping,
        is_full: deal.isFull,
        rating: 4.8,
        reviews_count: 420,
        featured: false,
        active: false,
        status: 'pendente_afiliado',
      };
      rowsToInsert.push(newRow);

      // Registra em existingProducts para proteger contra duplicados no mesmo lote
      existingProducts.push({
        id: `batch-${deal.mlbId}`,
        mlbId: deal.mlbId,
        title: deal.title,
        normTitle: normalizeTitle(deal.title),
        currentPrice: deal.currentPrice,
      });
    }
  }

  let inserted = [];
  if (rowsToInsert.length > 0) {
    const { data, error: insertErr } = await supabase
      .from('produtos_clarice')
      .insert(rowsToInsert)
      .select('id, mlb_id, title, category, discount_percent, status');

    if (insertErr) {
      console.error('❌ Erro ao salvar ofertas no Supabase:', insertErr.message);
      throw insertErr;
    }
    inserted = data || [];
  }

  console.log(`\n📊 Relatório de Deduplicação & Garimpo:`);
  console.log(`   ✨ Novos produtos inseridos: ${inserted.length}`);
  console.log(`   📉 Produtos atualizados por preço menor: ${updatedCheaperCount}`);
  console.log(`   ⏩ Duplicados ignorados (mais caros ou iguais): ${ignoredDuplicateCount}`);

  if (inserted.length > 0) {
    console.log(`\n🎉 ${inserted.length} achadinhos reais salvos na Fila do Radar (status: pendente_afiliado)!`);
    console.table(
      inserted.slice(0, 15).map((i) => ({
        MLB: i.mlb_id,
        Categoria: i.category,
        Título: i.title.slice(0, 36) + '...',
        Desconto: `${i.discount_percent}% OFF`,
        Status: i.status,
      }))
    );
    if (inserted.length > 15) {
      console.log(`... e mais ${inserted.length - 15} ofertas inseridas no banco.`);
    }
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
