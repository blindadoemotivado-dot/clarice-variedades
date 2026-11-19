import { chromium } from 'playwright';

async function runClientTest() {
  console.log('🧪 Iniciando teste E2E simulado do trajeto do cliente...');
  console.log('🌐 Acessando vitrine: https://clarice-variedades.vercel.app');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // 1. Acessa a home da vitrine em produção
    const response = await page.goto('https://clarice-variedades.vercel.app', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log(`✓ Status HTTP da Home: ${response.status()}`);
    await page.waitForTimeout(4000);

    // 2. Verifica a contagem de produtos exibidos
    const productArticles = page.locator('article');
    const totalCards = await productArticles.count();
    console.log(`📦 Cards de produtos detectados na vitrine: ${totalCards}`);

    if (totalCards === 0) {
      console.warn('⚠️ Nenhum card de produto encontrado na vitrine.');
      return;
    }

    // 3. Testa a conferência de 5 produtos publicados diferentes
    console.log('\n🔍 [Auditoria Produto x Destino] Testando 5 produtos publicados diferentes...');
    const testCount = Math.min(5, totalCards);
    const auditResults = [];

    for (let i = 0; i < testCount; i++) {
      const card = productArticles.nth(i);
      const cardTitle = (
        (await card.locator('h3, [class*="title"]').first().innerText().catch(() => '')) ||
        (await card.innerText()).slice(0, 40)
      ).trim();

      const offerLinkEl = card.locator('a:visible:has-text("Garantir Oferta no ML")').first();
      const shortUrl = await offerLinkEl.getAttribute('href');

      console.log(`\n[Produto ${i + 1}/${testCount}]`);
      console.log(`  Vitrine Card: "${cardTitle.slice(0, 45)}..."`);
      console.log(`  Link Curto: ${shortUrl}`);

      const [targetPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 20000 }).catch(() => null),
        offerLinkEl.click(),
      ]);

      const testPage = targetPage || page;
      await testPage.waitForLoadState('domcontentloaded').catch(() => {});
      await testPage.waitForTimeout(4000);

      const landedUrl = testPage.url();
      const pageTitle = (await testPage.title()).trim();
      const pageText = await testPage.locator('body').innerText().catch(() => '');

      const is404 =
        pageTitle.includes('Página não encontrada') ||
        pageText.includes('Esta página não existe') ||
        pageText.includes('Hubo un error') ||
        landedUrl.includes('404');

      const hasTracking =
        landedUrl.includes('matt_tool') ||
        landedUrl.includes('kd20250113073553') ||
        landedUrl.includes('clarice') ||
        shortUrl.includes('meli.la') ||
        shortUrl.includes('mercadolivre.com/sec');

      // Verifica correspondência de palavras-chave
      const cardWords = cardTitle
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      const matchWords = cardWords.filter((w) => pageTitle.toLowerCase().includes(w));
      const matchRatio = cardWords.length > 0 ? matchWords.length / cardWords.length : 1;
      const isProductMatch =
        matchRatio >= 0.25 || (cardWords[0] && pageTitle.toLowerCase().includes(cardWords[0]));

      auditResults.push({
        item: `#${i + 1}`,
        cardTitle: cardTitle.slice(0, 32) + '...',
        mlPageTitle: pageTitle.slice(0, 32) + '...',
        shortUrl,
        destinoValido: !is404,
        produtoCorrespondente: isProductMatch,
        rastreioAtivo: hasTracking,
      });

      console.log(`  🎯 Destino: ${landedUrl.slice(0, 65)}...`);
      console.log(`  🏷️ Título ML: "${pageTitle.slice(0, 45)}..."`);
      console.log(`  ✅ 404 Detectado: ${is404 ? 'SIM (ERRO)' : 'NÃO (OK)'}`);
      console.log(`  ✅ Correspondência de Produto: ${isProductMatch ? 'CONFIRMADA' : 'DIVERGENTE'}`);
      console.log(`  ✅ Rastreamento: ${hasTracking ? 'ATIVO' : 'INATIVO'}`);

      if (targetPage) await targetPage.close().catch(() => {});
    }

    console.log('\n📊 TABELA DE CONFERÊNCIA PRODUTO x DESTINO:');
    console.table(auditResults);

    // 4. Testa o botão amarelo do rodapé ("Vai comprar outro produto? Abrir Mercado Livre")
    console.log('\n🟡 [Teste Botão Amarelo Geral] Testando botão amarelo do rodapé...');
    const yellowBtn = page.locator('a:has-text("Vai comprar outro produto")').first();

    if ((await yellowBtn.count()) > 0) {
      const yellowHref = await yellowBtn.getAttribute('href');
      console.log(`🔗 Link configurado no botão amarelo: ${yellowHref}`);

      const [yellowPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
        yellowBtn.click({ force: true }),
      ]);

      const targetYellow = yellowPage || page;
      await targetYellow.waitForTimeout(4000);
      const yellowLanded = targetYellow.url();
      console.log(`🎯 URL de destino do botão amarelo: ${yellowLanded}`);

      const isYellowMonetized =
        yellowHref.includes('meli.la') ||
        yellowHref.includes('mercadolivre.com/sec') ||
        yellowLanded.includes('matt_tool') ||
        yellowLanded.includes('kd20250113073553');

      console.log(`✅ Rastreamento do botão amarelo validado: ${isYellowMonetized ? 'SIM' : 'NÃO'}`);
      if (yellowPage) await yellowPage.close().catch(() => {});
    }

    console.log('\n🎉 Auditoria e Teste E2E concluídos com sucesso!');
  } finally {
    await browser.close().catch(() => {});
  }
}

runClientTest().catch(console.error);
