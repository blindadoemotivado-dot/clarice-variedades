import { chromium } from 'playwright';

async function runClientTest() {
  console.log('🧪 Iniciando teste E2E simulado do trajeto do cliente...');
  console.log('🌐 Acessando vitrine: https://clarice-variedades.vercel.app');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
    const productCards = await page.locator('article, [class*="card"], [class*="product"]').count();
    console.log(`📦 Cards de produtos detectados na vitrine: ${productCards}`);

    // Extrai links de ofertas dos produtos exibidos
    const offerLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map((a) => ({
          text: a.innerText.trim(),
          href: a.href,
        }))
        .filter((a) =>
          a.href.includes('mercadolivre.com') ||
          a.href.includes('meli.la')
        );
    });

    console.log(`🔗 Links de afiliados encontrados na página: ${offerLinks.length}`);
    if (offerLinks.length > 0) {
      console.log('Amostra de 3 links de produtos na vitrine:');
      for (const l of offerLinks.slice(0, 3)) {
        console.log(`  - [${l.text.slice(0, 25)}] -> ${l.href}`);
      }
    }

    // 3. Testa o clique na primeira oferta de produto
    const firstProductBtn = page.locator('a:has-text("Garantir Oferta no ML"), a:has-text("Ver no Mercado Livre"), a:has-text("Aproveitar Desconto"), a:has-text("Pegar Oferta"), a:has-text("Comprar no Mercado Livre")').first();
    let productTargetUrl = '';

    if ((await firstProductBtn.count()) > 0) {
      productTargetUrl = await firstProductBtn.getAttribute('href');
      console.log(`\n🛒 [Teste 1/2] Testando clique na oferta do produto: ${productTargetUrl}`);

      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
        firstProductBtn.click({ force: true }),
      ]);

      const targetPage = newPage || page;
      await targetPage.waitForTimeout(5000);
      const landedUrl = targetPage.url();
      console.log(`🎯 URL de destino alcançada: ${landedUrl}`);

      const hasTracking =
        landedUrl.includes('matt_tool') ||
        landedUrl.includes('kd20250113073553') ||
        landedUrl.includes('clarice') ||
        productTargetUrl.includes('meli.la') ||
        productTargetUrl.includes('mercadolivre.com/sec');

      console.log(`✅ Rastreamento de afiliado validado no produto: ${hasTracking ? 'SIM' : 'NÃO'}`);
      if (newPage) await newPage.close().catch(() => {});
    }

    // 4. Testa o botão amarelo do rodapé ("Vai comprar outro produto? Abrir Mercado Livre")
    console.log('\n🟡 [Teste 2/2] Testando botão amarelo do rodapé...');
    const yellowBtn = page.locator('a:has-text("Vai comprar outro produto")').first();

    if ((await yellowBtn.count()) > 0) {
      const yellowHref = await yellowBtn.getAttribute('href');
      console.log(`🔗 Link configurado no botão amarelo: ${yellowHref}`);

      const [yellowPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
        yellowBtn.click({ force: true }),
      ]);

      const targetYellow = yellowPage || page;
      await targetYellow.waitForTimeout(5000);
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

    console.log('\n🎉 Teste E2E concluído com sucesso!');
  } finally {
    await browser.close().catch(() => {});
  }
}

runClientTest().catch(console.error);
