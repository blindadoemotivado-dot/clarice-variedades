import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

// --------------------------------------------------------------------------
// 1. Carregamento de Variáveis de Ambiente (.env.local)
// --------------------------------------------------------------------------
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Supabase URL ou Service Key não configurados em .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// --------------------------------------------------------------------------
// 2. Consulta Rápida via API Pública do Mercado Livre
// --------------------------------------------------------------------------
async function checkItemViaPublicApi(mlbId) {
  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${mlbId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(1800),
    });

    if (res.status === 200) {
      const json = await res.json();
      return {
        success: true,
        source: 'api',
        isPaused: json.status !== 'active',
        isOutOfStock: (json.available_quantity ?? 0) <= 0,
        currentPrice: Number(json.price ?? 0),
        originalPrice: Number(json.original_price || json.base_price || 0),
      };
    }
    return { success: false, status: res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------------
// 3. Fallback Leve via Microsoft Edge (Playwright) com Abort de Mídia
// --------------------------------------------------------------------------
async function inspectItemViaPage(page, item) {
  const digits = String(item.mlb_id || '').replace(/\D/g, '');
  const mlbId = `MLB${digits}`;

  // Se for ID de catálogo (<= 8 dígitos), testa primeiro na URL canônica /p/
  const url =
    digits.length <= 8
      ? `https://www.mercadolivre.com.br/p/${mlbId}`
      : `https://produto.mercadolivre.com.br/MLB-${digits}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 9000 });
    await page.waitForTimeout(400);

    const data = await page.evaluate(() => {
      const text = document.body.innerText || '';

      const isPaused =
        text.includes('Anúncio pausado') ||
        text.includes('Publicação pausada') ||
        text.includes('Finalizada') ||
        text.includes('Este anúncio foi pausado') ||
        text.includes('Hubo un error') ||
        text.includes('Ops! Esse anúncio');

      const isOutOfStock =
        text.includes('Estoque esgotado') ||
        text.includes('Não temos estoque') ||
        text.includes('Sem estoque');

      const prevPriceEl = document.querySelector(
        's .andes-money-amount__fraction, .andes-money-amount--previous .andes-money-amount__fraction, s.andes-money-amount, .ui-pdp-price__original-value .andes-money-amount__fraction'
      );
      const currentPriceEl = document.querySelector(
        '.ui-pdp-price__second-line .andes-money-amount__fraction, .poly-price__current .andes-money-amount__fraction, .andes-money-amount:not(.andes-money-amount--previous) .andes-money-amount__fraction'
      );
      const currentCentsEl = document.querySelector(
        '.ui-pdp-price__second-line .andes-money-amount__cents, .poly-price__current .andes-money-amount__cents'
      );

      const parseBRL = (t) => {
        if (!t) return 0;
        const cleaned = t.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      };

      const fraction = parseBRL(currentPriceEl?.textContent);
      const cents = currentCentsEl?.textContent ? parseInt(currentCentsEl.textContent, 10) / 100 : 0;
      const currentPrice = fraction ? fraction + cents : 0;
      const originalPrice = parseBRL(prevPriceEl?.textContent);

      return {
        isPaused,
        isOutOfStock,
        currentPrice,
        originalPrice,
      };
    });

    return {
      success: true,
      source: 'playwright',
      ...data,
    };
  } catch (err) {
    return {
      success: false,
      source: 'playwright',
      isPaused: true,
      isOutOfStock: true,
      currentPrice: 0,
      originalPrice: 0,
      error: err.message,
    };
  }
}

// --------------------------------------------------------------------------
// 4. Motor Principal de Sincronização
// --------------------------------------------------------------------------
export async function sincronizarVitrine() {
  console.log('=============================================================');
  console.log('🔄 [Clarice Achadinhos] Sincronização de Preços & Estoque');
  console.log('=============================================================');

  // 1. Busca todos os produtos ativos no Supabase
  console.log('📦 Consultando produtos ativos no Supabase...');
  const { data: activeProducts, error: fetchErr } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, title, current_price, original_price, discount_percent, status, active')
    .eq('status', 'ativo')
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('❌ Erro ao buscar produtos ativos no Supabase:', fetchErr.message);
    throw fetchErr;
  }

  if (!activeProducts || activeProducts.length === 0) {
    console.log('ℹ️ Nenhum produto ativo encontrado para sincronizar.');
    return { total: 0, mantidos: 0, atualizados: 0, retirados: 0 };
  }

  console.log(`🔎 Total de produtos ativos a verificar: ${activeProducts.length}`);

  // 2. Tentar API pública primeiro em lotes concorrentes
  console.log('⚡ Etapa 1: Verificando disponibilidade via API do Mercado Livre...');
  const itemsNeedingBrowser = [];
  const verifiedResults = new Map();

  const API_CHUNK = 20;
  for (let i = 0; i < activeProducts.length; i += API_CHUNK) {
    const chunk = activeProducts.slice(i, i + API_CHUNK);
    await Promise.all(
      chunk.map(async (item) => {
        const rawDigits = String(item.mlb_id || '').replace(/\D/g, '');
        const mlbId = `MLB${rawDigits}`;
        const apiResult = await checkItemViaPublicApi(mlbId);
        if (apiResult.success) {
          verifiedResults.set(item.id, apiResult);
        } else {
          itemsNeedingBrowser.push(item);
        }
      })
    );
  }

  console.log(`✓ Validados via API direta: ${verifiedResults.size}`);
  console.log(`🌐 Requerem inspeção via Microsoft Edge: ${itemsNeedingBrowser.length}`);

  // 3. Fallback Leve Playwright caso haja itens barrados com 403 / não encontrados na API
  let browserContext = null;
  if (itemsNeedingBrowser.length > 0) {
    const profileDir = path.resolve(process.cwd(), '.edge-ml-profile');

    // Limpeza de travas residuais exclusivas da pasta .edge-ml-profile
    try {
      if (fs.existsSync(profileDir)) {
        const files = fs.readdirSync(profileDir);
        for (const f of files) {
          if (f.startsWith('Singleton') || f === 'lockfile') {
            try {
              fs.unlinkSync(path.join(profileDir, f));
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    const CONCURRENCY = 5;
    console.log(`🚀 Inicializando navegador Edge (${CONCURRENCY} workers simultâneos)...`);

    browserContext = await chromium.launchPersistentContext(profileDir, {
      channel: 'msedge',
      headless: false,
      viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const pages = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const p = await browserContext.newPage();
      // Bloqueia mídias pesadas para navegação ultra-rápida (carrega só o DOM essencial)
      await p.route('**/*.{png,jpg,jpeg,webp,gif,svg,css,woff,woff2}', (route) => route.abort());
      pages.push(p);
    }

    let currentIndex = 0;
    const totalToProcess = itemsNeedingBrowser.length;

    async function browserWorker(page, workerId) {
      while (currentIndex < totalToProcess) {
        const itemIndex = currentIndex++;
        const item = itemsNeedingBrowser[itemIndex];
        const res = await inspectItemViaPage(page, item);
        verifiedResults.set(item.id, res);

        const progress = Math.min(currentIndex, totalToProcess);
        if (progress % 10 === 0 || progress === totalToProcess) {
          process.stdout.write(`⏳ Progresso da sincronização: ${progress}/${totalToProcess} produtos analisados...\r`);
        }
      }
    }

    try {
      await Promise.all(pages.map((p, i) => browserWorker(p, i + 1)));
      console.log(`\n✓ Todos os ${totalToProcess} produtos foram inspecionados com sucesso!`);
    } finally {
      await browserContext.close().catch(() => {});
    }
  }

  // 4. Aplicação das Regras de Proteção de Credibilidade
  console.log('\n⚖️ Aplicando regras de proteção de credibilidade no catálogo...');

  let mantidos = 0;
  let atualizados = 0;
  let retirados = 0;

  const deactivatedDetails = [];
  const updatedDetails = [];

  for (const item of activeProducts) {
    const result = verifiedResults.get(item.id);
    if (!result) continue;

    const currentPrice = Number(result.currentPrice ?? 0);
    const originalPrice = Number(result.originalPrice ?? 0);

    // Cálculo do desconto real atualizado
    const discountPercent =
      originalPrice > currentPrice && currentPrice > 0
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;

    // Regras de desativação:
    // 1. Anúncio pausado/encerrado
    // 2. Sem estoque
    // 3. Preço inválido (<= 0)
    // 4. Fim do desconto promocional (original_price <= current_price ou desconto < 10%)
    let deactivateReason = null;
    if (result.isPaused) {
      deactivateReason = 'Anúncio pausado/encerrado no Mercado Livre';
    } else if (result.isOutOfStock) {
      deactivateReason = 'Estoque esgotado no Mercado Livre';
    } else if (currentPrice <= 0) {
      deactivateReason = 'Anúncio indisponível ou página não encontrada';
    } else if (originalPrice <= currentPrice) {
      deactivateReason = 'Preço promocional encerrado (sem desconto)';
    } else if (discountPercent < 10) {
      deactivateReason = `Desconto abaixo do limite de 10% (atual: ${discountPercent}% OFF)`;
    }

    if (deactivateReason) {
      // Retira imediatamente da vitrine pública
      const { error: updErr } = await supabase
        .from('produtos_clarice')
        .update({
          status: 'inativo',
          active: false,
        })
        .eq('id', item.id);

      if (!updErr) {
        retirados++;
        deactivatedDetails.push({
          mlb: item.mlb_id,
          título: item.title.slice(0, 35) + '...',
          motivo: deactivateReason,
        });
      }
    } else {
      // Produto continua ativo em promoção com desconto >= 10%
      const oldCurrent = Number(item.current_price || 0);
      const oldOriginal = Number(item.original_price || 0);
      const priceChanged =
        Math.abs(oldCurrent - currentPrice) > 0.05 ||
        Math.abs(oldOriginal - originalPrice) > 0.05;

      if (priceChanged) {
        // Atualiza preços e percentual de desconto no Supabase
        const { error: updErr } = await supabase
          .from('produtos_clarice')
          .update({
            current_price: currentPrice,
            original_price: originalPrice,
            discount_percent: discountPercent,
            badge_text: `Radar ${discountPercent}% OFF`,
            status: 'ativo',
            active: true,
          })
          .eq('id', item.id);

        if (!updErr) {
          atualizados++;
          updatedDetails.push({
            mlb: item.mlb_id,
            título: item.title.slice(0, 30) + '...',
            de: `R$ ${oldCurrent.toFixed(2)} (${item.discount_percent}% OFF)`,
            para: `R$ ${currentPrice.toFixed(2)} (${discountPercent}% OFF)`,
          });
        }
      } else {
        mantidos++;
      }
    }
  }

  // 5. Exibição do Resumo
  console.log('\n=============================================================');
  console.log('📊 RESUMO DA SINCRONIZAÇÃO DA VITRINE CLARICE ACHADINHOS');
  console.log('=============================================================');
  console.log(`📦 Total de produtos avaliados: ${activeProducts.length}`);
  console.log(`✅ Mantidos ativos (preço e estoque fiéis): ${mantidos}`);
  console.log(`⚡ Preços/Descontos atualizados no banco: ${atualizados}`);
  console.log(`🚫 Retirados da vitrine (pausados/sem estoque/sem desconto): ${retirados}`);
  console.log('=============================================================\n');

  if (updatedDetails.length > 0) {
    console.log('📈 Amostra de produtos com preço/desconto atualizado:');
    console.table(updatedDetails.slice(0, 8));
  }

  if (deactivatedDetails.length > 0) {
    console.log('\n🛑 Amostra de produtos retirados da vitrine pública:');
    console.table(deactivatedDetails.slice(0, 10));
    if (deactivatedDetails.length > 10) {
      console.log(`... e mais ${deactivatedDetails.length - 10} produtos desativados.`);
    }
  }

  return {
    total: activeProducts.length,
    mantidos,
    atualizados,
    retirados,
  };
}

// Execução direta via CLI (node scripts/sincronizar-vitrine.mjs)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  sincronizarVitrine()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Falha fatal na sincronização:', err);
      process.exit(1);
    });
}
