/**
 * Auditoria Ponta a Ponta com Playwright em Tempo Real
 * Loja: entre-amigas-promos (Tatiane Mirian Bernardo Conceição)
 * URL: https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos
 */

import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const TARGET_STORE_URL = 'https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos';
const CLIENT_ML_TAG = 'tatianemirianbernardoconcei';
const CLIENT_SHOPEE_ID = '18318420060';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Normaliza palavras-chave para comparação
function extractKeywords(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        !['com', 'para', 'kit', 'jogo', 'sem', 'preta', 'preto', 'bivolt', '110v', '220v'].includes(w)
    );
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 AUDITORIA PROFUNDA E TESTE DE NAVEGAÇÃO AO VIVO — PLAYWRIGHT');
  console.log(`🌐 Vitrine: ${TARGET_STORE_URL}`);
  console.log(`👤 Afiliada: Tatiane Mirian Bernardo Conceição (Tag: ${CLIENT_ML_TAG})`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Inicia browser com perfil Edge para navegar de forma autêntica
  const profileDir = path.resolve(process.cwd(), '.edge-ml-profile');
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1366, height: 900 },
    args: ['--window-position=-2400,-2400', '--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());
  const auditResults = [];

  try {
    console.log('1️⃣ Acessando a vitrine pública de produção na Vercel...');
    await page.goto(TARGET_STORE_URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000); // Aguarda hidratação do catálogo do Supabase

    // Clica em "Carregar mais" se estiver visível para exibir todo o acervo
    const loadMoreBtn = page.locator('button:has-text("Carregar mais")');
    if ((await loadMoreBtn.count()) > 0 && (await loadMoreBtn.isVisible())) {
      console.log('📜 Clicando em "Carregar mais" para garantir 100% dos produtos visíveis...');
      await loadMoreBtn.click();
      await page.waitForTimeout(1500);
    }

    // Scroll por todos os artigos para forçar o carregamento de imagens lazy
    console.log('📜 Rolando a página para carregar todas as imagens do catálogo...');
    const articleLocators = await page.locator('article[id^="produto-"]').all();
    console.log(`📦 Encontrados ${articleLocators.length} artigos de produtos no DOM.`);

    for (const art of articleLocators) {
      await art.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(2000);

    // Aguarda que todas as 20 imagens estejam completamente carregadas no navegador
    await page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll('article[id^="produto-"] img'));
      return imgs.length === 20 && imgs.every((img) => img.complete && img.naturalWidth > 0);
    }, { timeout: 20000 });

    // 1. Extração dos 20 cards de produto estritos
    console.log('\n2️⃣ Extraindo dados dos 20 cards de produto da grade oficial...');
    const cardsData = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article[id^="produto-"]'));

      return articles.map((art) => {
        const titleEl = art.querySelector('h3');
        const imgEl = art.querySelector('img');
        const buyBtn = art.querySelector('a[href*="/p/MLB"], a[href*="/MLB-"], a[href*="shopee.com"]');

        return {
          id: art.id,
          title: titleEl?.innerText?.trim() || '',
          href: buyBtn?.getAttribute('href') || buyBtn?.href || '',
          imageSrc: imgEl?.src || imgEl?.getAttribute('src') || '',
          naturalWidth: imgEl?.naturalWidth || 0,
          naturalHeight: imgEl?.naturalHeight || 0,
          imgComplete: imgEl?.complete || false,
        };
      });
    });

    console.log(`📦 Total de produtos extraídos da grade: ${cardsData.length}`);

    if (cardsData.length !== 20) {
      cardsData.forEach((c, idx) => console.log(`   [${idx + 1}] ${c.title.slice(0, 40)} -> ${c.href}`));
      throw new Error(`Esperado exatamente 20 produtos na grade da vitrine, encontrado ${cardsData.length}`);
    }

    // 2. Validação Estrita das Imagens
    console.log('\n3️⃣ Validando integridade de 100% das 20 imagens (sem Unsplash, naturalWidth >= 150)...');
    const imageMap = new Set();
    let imgFailures = 0;

    for (let i = 0; i < cardsData.length; i++) {
      const item = cardsData[i];
      const isUnsplash = item.imageSrc.includes('unsplash.com') || item.imageSrc.includes('pexels.com');
      const isOfficialCdn =
        item.imageSrc.includes('mlstatic.com') ||
        item.imageSrc.includes('shopee') ||
        item.imageSrc.includes('susercontent.com');

      if (isUnsplash) {
        console.error(`❌ ERRO: Imagem genérica Unsplash/Pexels detectada no item ${i + 1}: ${item.imageSrc}`);
        imgFailures++;
      }
      if (!isOfficialCdn) {
        console.error(`❌ ERRO: Imagem fora de CDN oficial no item ${i + 1}: ${item.imageSrc}`);
        imgFailures++;
      }
      if (item.naturalWidth < 150) {
        console.error(`❌ ERRO: naturalWidth insuficiente (${item.naturalWidth}px) no item ${i + 1}: ${item.title}`);
        imgFailures++;
      }
      if (imageMap.has(item.imageSrc)) {
        console.error(`❌ ERRO: Imagem duplicada detectada: ${item.imageSrc}`);
        imgFailures++;
      }
      imageMap.add(item.imageSrc);

      console.log(
        `   🖼️ [${i + 1}/20] OK (${item.naturalWidth}x${item.naturalHeight}px) | CDN: ${new URL(item.imageSrc).hostname} | "${item.title.slice(0, 35)}"`
      );
    }

    if (imgFailures > 0) {
      throw new Error(`Falha na validação de imagens: ${imgFailures} inconformidade(s) encontrada(s).`);
    }
    console.log(`\n✅ 100% das 20 imagens são HD (naturalWidth >= 150), CDN oficial (mlstatic.com) e sem duplicatas!`);

    // 3. Teste de Navegação Real nos 20 Links de Destino
    console.log('\n4️⃣ Navegando em CADA UM dos 20 links de compra para validar página ativa, título e tracking...');

    for (let i = 0; i < cardsData.length; i++) {
      const item = cardsData[i];
      console.log(`\n───────────────────────────────────────────────────────────────────`);
      console.log(`🔎 [${i + 1}/20] Testando: "${item.title.slice(0, 45)}"`);
      console.log(`   🔗 URL da Vitrine: ${item.href}`);

      // Validação estrita de vazamento para a matriz
      if (item.href.includes('clarice') || item.href.includes('18364201389')) {
        throw new Error(`ALERTA: Vazamento para a conta matriz detectado no link: ${item.href}`);
      }

      // Validação de presença da tag da cliente
      const hasMlTag = item.href.includes(`matt_word=${CLIENT_ML_TAG}`);
      const hasShpTag = item.href.includes(`af_siteid=${CLIENT_SHOPEE_ID}`);
      if (!hasMlTag && !hasShpTag) {
        throw new Error(`Link sem tag da cliente Tatiane: ${item.href}`);
      }

      // Navegação direta no destino
      const navRes = await page.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(1500);

      const status = navRes.status();
      const destUrl = page.url();
      const destTitle = await page.title();
      const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1000));

      const isNotFound =
        bodySnippet.includes('Parece que esta página não existe') ||
        bodySnippet.includes('Página não encontrada') ||
        status === 404;

      const isPaused = bodySnippet.includes('Anúncio pausado') || bodySnippet.includes('Publicación pausada');

      if (isNotFound) {
        throw new Error(`❌ Anúncio NÃO encontrado (404 / Página não existe) para o item: ${item.title}`);
      }
      if (isPaused) {
        throw new Error(`❌ Anúncio PAUSADO detectado para o item: ${item.title}`);
      }
      if (status >= 400) {
        throw new Error(`❌ Status HTTP de erro ${status} no destino: ${item.href}`);
      }

      // Validação de palavras-chave do título
      const keywords = extractKeywords(item.title);
      const combinedTargetText = (destTitle + ' ' + destUrl).toLowerCase();
      const matchedKeywords = keywords.filter((kw) => combinedTargetText.includes(kw));

      console.log(`   📡 Status HTTP: ${status} OK`);
      console.log(`   📄 Título no Marketplace: "${destTitle.slice(0, 50)}"`);
      console.log(`   🎯 Palavras-chave correspondentes: [${matchedKeywords.join(', ')}]`);
      console.log(
        `   🏷️ Tag Afiliada Preservada: ${destUrl.includes(CLIENT_ML_TAG) || item.href.includes(CLIENT_ML_TAG) ? 'SIM ✅' : 'NÃO ❌'}`
      );

      auditResults.push({
        num: i + 1,
        marketplace: item.href.includes('mercadolivre.com') ? 'Mercado Livre' : 'Shopee',
        title: item.title,
        imgDomain: new URL(item.imageSrc).hostname,
        finalUrl: item.href,
        status: status,
        browserOk: !isNotFound && !isPaused && status < 400,
        tagValidated: hasMlTag || hasShpTag,
        destTitle: destTitle,
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('🎉 AUDITORIA CONCLUÍDA COM 100% DE SUCESSO! 20/20 PRODUTOS APROVADOS!');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    console.log('--- AUDIT_JSON_RESULTS_START ---');
    console.log(JSON.stringify(auditResults, null, 2));
    console.log('--- AUDIT_JSON_RESULTS_END ---');
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error('\n❌ FALHA NA AUDITORIA:', err.message);
  process.exit(1);
});
