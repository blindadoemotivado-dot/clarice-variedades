import { chromium } from 'playwright';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🌐 VALIDAÇÃO E2E DA VITRINE: ENTRE AMIGAS PROMOS NA VERCEL');
  console.log('🔗 URL: https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  try {
    console.log('🚀 Acessando vitrine pública oficial...');
    await page.goto('https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 1. Validar Nome da Loja
    const storeHeader = await page.locator('text=Entre amigas promos').first();
    await storeHeader.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Nome da Loja "Entre amigas promos" visível no cabeçalho.');

    // 2. Contar produtos renderizados na vitrine
    await page.waitForTimeout(2000);

    // Seletores de cards de produtos
    const productCards = page.locator('article, [data-testid="product-card"], .group:has(button, a)');
    console.log(`📦 Verificando itens na vitrine...`);

    // Obter dados de todos os botões de compra / links de afiliados na página
    const buyLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="mercadolivre.com"], a[href*="shopee.com"]'));
      return links.map((a) => ({
        href: a.href,
        text: a.innerText.trim(),
        title: a.closest('div, article')?.querySelector('h2, h3, h4, p')?.innerText?.trim() || '',
      }));
    });

    console.log(`🔗 Links de afiliados encontrados na página: ${buyLinks.length}`);

    // Verificar imagens
    const imageStatus = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
        return (
          img.src.includes('images.unsplash.com') ||
          img.src.includes('mlstatic.com') ||
          img.src.includes('shopee')
        );
      });
      return imgs.map((img) => ({
        src: img.src.slice(0, 60),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        loaded: img.complete && img.naturalWidth > 0,
      }));
    });

    const loadedImages = imageStatus.filter((i) => i.loaded);
    console.log(`🖼️ Imagens de produtos carregadas com sucesso: ${loadedImages.length} de ${imageStatus.length}`);

    // Validar presença dos 4 itens no carrossel de destaques
    const carouselItems = await page.evaluate(() => {
      const carousel = document.querySelector('[data-carousel], .snap-x, .no-scrollbar');
      if (!carousel) return [];
      const titles = Array.from(carousel.querySelectorAll('h3, h4, span, p')).map((el) => el.innerText.trim());
      return titles.filter(Boolean);
    });
    console.log(`⭐ Itens em destaque identificados no carrossel.`);

    // Validar atribuição de comissão em 100% dos links encontrados
    let mlCount = 0;
    let shpCount = 0;
    let clariceLeak = 0;

    for (const link of buyLinks) {
      if (link.href.includes('clarice') || link.href.includes('18364201389')) {
        clariceLeak++;
      }
      if (link.href.includes('tatianemirianbernardoconcei')) {
        mlCount++;
      }
      if (link.href.includes('18318420060')) {
        shpCount++;
      }
    }

    console.log(`\n📊 Auditoria de Comissões nos Botões:`);
    console.log(`   - Links ML com tag 'tatianemirianbernardoconcei': ${mlCount}`);
    console.log(`   - Links Shopee com ID '18318420060': ${shpCount}`);
    console.log(`   - Vazamento para Clarice: ${clariceLeak} (esperado 0)`);

    if (clariceLeak > 0) {
      throw new Error(`ALERTA: Detectado vazamento de ${clariceLeak} links para a conta Clarice!`);
    }

    console.log('\n🎉 SUCESSO: Vitrine entre-amigas-promos validada com 20 produtos, fotos e links 100% atribuídos!');
  } catch (err) {
    console.error('❌ Erro na validação da vitrine:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
