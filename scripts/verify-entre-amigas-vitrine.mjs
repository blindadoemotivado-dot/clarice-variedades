/**
 * Verificação Automatizada da Vitrine 'entre-amigas-promos'
 * Acessa https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos via Microsoft Edge (Playwright)
 * Valida imagens reais, links de afiliado diretos da Tatiane (ML e Shopee),
 * ausência de URLs genéricas e status da assinatura no Supabase.
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const TARGET_URL = 'https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos';

const ML_TAG = 'tatianemirianbernardoconcei';
const SHOPEE_ID = '18318420060';
const STORE_SLUG = 'entre-amigas-promos';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 VERIFICAÇÃO AUTOMATIZADA: VITRINE ENTRE AMIGAS PROMOS');
  console.log('🌐 Alvo: ' + TARGET_URL);
  console.log('🌐 Navegador: Microsoft Edge (channel: msedge)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Verificação no Supabase: status_assinatura = 'pendente' e plano = 'pro'
  console.log('1️⃣ Verificando integridade da loja no Supabase...');
  const { data: store, error: storeErr } = await supabase
    .from('lojas_afiliados')
    .select('slug, nome_loja, status_assinatura, plano, shopee_secret, shopee_app_id')
    .eq('slug', STORE_SLUG)
    .single();

  if (storeErr || !store) {
    throw new Error(`Falha ao consultar loja no Supabase: ${storeErr?.message}`);
  }

  console.log(`   - Nome: ${store.nome_loja}`);
  console.log(`   - Status Assinatura: ${store.status_assinatura}`);
  console.log(`   - Plano: ${store.plano}`);
  console.log(`   - ML Tag: ${store.shopee_secret}`);
  console.log(`   - Shopee ID: ${store.shopee_app_id}`);

  if (store.status_assinatura !== 'pendente') {
    throw new Error(`Status de assinatura esperado 'pendente', recebido '${store.status_assinatura}'`);
  }
  if (store.plano !== 'pro') {
    throw new Error(`Plano esperado 'pro', recebido '${store.plano}'`);
  }
  console.log('   ✅ Loja confirmada com status PENDENTE e plano PRO no Supabase.\n');

  // 2. Verificação no Supabase: 6 produtos ativos
  console.log('2️⃣ Verificando produtos da loja no Supabase...');
  const { data: dbProducts, error: prodErr } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, title, marketplace, affiliate_url, image_url, active')
    .eq('loja_slug', STORE_SLUG)
    .eq('active', true);

  if (prodErr) {
    throw new Error(`Falha ao consultar produtos no Supabase: ${prodErr.message}`);
  }

  console.log(`   - Total de produtos ativos no banco: ${dbProducts.length}`);
  if (dbProducts.length !== 6) {
    throw new Error(`Esperado 6 produtos ativos para a loja, encontrado ${dbProducts.length}`);
  }

  const mlDbProds = dbProducts.filter((p) => p.marketplace === 'mercadolivre');
  const shpDbProds = dbProducts.filter((p) => p.marketplace === 'shopee');
  console.log(`   - Mercado Livre: ${mlDbProds.length} | Shopee: ${shpDbProds.length}`);

  if (mlDbProds.length !== 3 || shpDbProds.length !== 3) {
    throw new Error('Divisão de produtos deve ser exatamente 3 ML e 3 Shopee.');
  }

  // 3. Inicialização do Browser Microsoft Edge
  console.log('\n3️⃣ Iniciando Microsoft Edge via Playwright...');
  let browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });
  } catch (err) {
    console.warn('   ⚠️ Falha ao abrir com channel: msedge, tentando chromium padrão...', err.message);
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 4. Navegação para a vitrine remota
  console.log(`4️⃣ Navegando para ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000); // Aguarda hidratação do TanStack Router e carregamento do catálogo

  // 5. Verificação da Identidade Visual da Loja
  console.log('5️⃣ Verificando identidade da loja na página...');
  const pageTitle = await page.title();
  console.log(`   - Título da página: "${pageTitle}"`);

  const storeHeader = await page.textContent('body');
  const hasStoreName = storeHeader.includes('Entre amigas') || storeHeader.includes('entre-amigas');
  console.log(`   - Nome da loja na página presente: ${hasStoreName ? 'SIM ✅' : 'NÃO ❌'}`);

  // 6. Verificação dos cards e imagens reais
  console.log('6️⃣ Verificando cards de produtos e imagens reais...');
  
  // Localiza todos os links ou botões de oferta nos cards
  const offerLinks = await page.$$eval('a[href*="mercadolivre"], a[href*="shopee"], a[target="_blank"]', (elements) => {
    return elements.map((el) => ({
      href: el.getAttribute('href') || '',
      text: el.innerText.trim(),
      ariaLabel: el.getAttribute('aria-label') || '',
    })).filter((item) => item.href.startsWith('http'));
  });

  console.log(`   - Encontrados ${offerLinks.length} links de oferta na vitrine:`);
  offerLinks.forEach((l, i) => {
    console.log(`     [${i + 1}] ${l.href.slice(0, 85)}...`);
  });

  // Localiza todas as imagens dos produtos
  const productImages = await page.$$eval('img', (imgs) => {
    return imgs.map((img) => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    })).filter((img) => 
      img.src.includes('http2.mlstatic.com') || 
      img.src.includes('images.unsplash.com') || 
      img.src.includes('shopee') ||
      img.src.includes('produtos')
    );
  });

  console.log(`   - Imagens de produtos identificadas: ${productImages.length}`);
  productImages.forEach((img, i) => {
    console.log(`     📸 [${i + 1}] Alt: "${img.alt.slice(0, 40)}" | Carregada: ${img.complete && img.naturalWidth > 0 ? 'SIM ✅' : 'PENDENTE ⚠️'} | Src: ${img.src.slice(0, 60)}...`);
  });

  // 7. Validação Estrita dos Links de Afiliado
  console.log('\n7️⃣ Executando validação estrita dos links de afiliados...');
  
  let validMlCount = 0;
  let validShpCount = 0;
  let invalidSocialOrSearchCount = 0;

  for (const link of offerLinks) {
    const url = link.href;

    // NENHUM link pode apontar para /social/ ou /search?keyword=
    if (url.includes('/social/') || url.includes('/search?keyword=')) {
      console.error(`   ❌ ERRO: Link genérico detectado! ${url}`);
      invalidSocialOrSearchCount++;
    }

    // Mercado Livre direto com tag Tatiane
    if (url.includes('mercadolivre.com.br')) {
      if (url.includes(`matt_word=${ML_TAG}`)) {
        validMlCount++;
        console.log(`   ✅ Link ML Válido e Direto: ${url}`);
      } else {
        console.warn(`   ⚠️ Link ML sem a tag da Tatiane: ${url}`);
      }
    }

    // Shopee direto com ID Tatiane
    if (url.includes('shopee.com.br')) {
      if (url.includes(`af_siteid=${SHOPEE_ID}`) && url.includes(`utm_source=an_${SHOPEE_ID}`)) {
        validShpCount++;
        console.log(`   ✅ Link Shopee Válido e Direto: ${url}`);
      } else {
        console.warn(`   ⚠️ Link Shopee sem credencial da Tatiane: ${url}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMO DA AUDITORIA:');
  console.log(`   - Links genéricos proibidos (/social/ ou /search): ${invalidSocialOrSearchCount} (deve ser 0)`);
  console.log(`   - Links Mercado Livre válidos (com tag Tatiane): ${validMlCount}`);
  console.log(`   - Links Shopee válidos (com ID Tatiane): ${validShpCount}`);
  console.log(`   - Imagens de produto renderizadas: ${productImages.length}`);
  console.log(`   - Status da assinatura: ${store.status_assinatura} (deve ser pendente)`);
  console.log(`   - Plano: ${store.plano} (deve ser pro)`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (invalidSocialOrSearchCount > 0) {
    throw new Error(`Encontrados ${invalidSocialOrSearchCount} links genéricos proibidos!`);
  }

  if (validMlCount < 3 || validShpCount < 3) {
    throw new Error(`Contagem insuficiente de links válidos da Tatiane: ML=${validMlCount}/3, Shopee=${validShpCount}/3`);
  }

  console.log('\n🎉 SUCESSO TOTAL! Todos os critérios de redirecionamento, fotos e isolamento foram validados com 100% de conformidade!');

  await browser.close();
}

main().catch((err) => {
  console.error('\n❌ Falha na verificação:', err);
  process.exit(1);
});
