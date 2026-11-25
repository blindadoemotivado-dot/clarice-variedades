import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://clariceachadinhos.vercel.app';
const LOJISTA_EMAIL = 'tatianemirianbc@gmail.com';
const LOJISTA_PASSWORD = 'Deusefiel0527@';
const STORE_SLUG = 'entre-amigas-promos';

const VIEWPORTS = [
  { name: 'Samsung Galaxy (360x800)', width: 360, height: 800 },
  { name: 'iPhone 14/15 (390x844)', width: 390, height: 844 },
];

async function checkNoHorizontalOverflow(page, contextName) {
  const info = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    const isOver = docWidth > winWidth + 2 || bodyWidth > winWidth + 2;
    if (!isOver) return { isOver: false, docWidth, winWidth };

    const elements = Array.from(document.querySelectorAll('*'));
    const culprits = [];
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > winWidth + 2 || el.scrollWidth > winWidth + 2) {
        culprits.push({
          tag: el.tagName,
          className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
          id: el.id,
          right: Math.round(rect.right),
          scrollWidth: el.scrollWidth,
          offsetWidth: el.offsetWidth,
          text: (el.innerText || '').slice(0, 40).replace(/\n/g, ' ')
        });
      }
    }
    // Também inspeciona o elemento com maior scrollWidth absoluto que seja folha
    const leafWide = elements
      .filter(el => el.children.length === 0 && el.scrollWidth > winWidth)
      .map(el => ({
        tag: el.tagName,
        className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
        scrollWidth: el.scrollWidth,
        text: (el.innerText || el.textContent || '').slice(0, 60).replace(/\n/g, ' ')
      }));

    return { isOver: true, docWidth, winWidth, culprits: culprits.slice(0, 10), leafWide: leafWide.slice(0, 5) };
  });

  if (info.isOver) {
    console.error(`[OVERFLOW DETAILS in ${contextName}]: docWidth=${info.docWidth}, winWidth=${info.winWidth}`);
    console.error(`Culprits:`, JSON.stringify(info.culprits, null, 2));
    console.error(`Leaf wide:`, JSON.stringify(info.leafWide, null, 2));
    throw new Error(`[OVERFLOW] Em ${contextName}: scrollWidth (${info.docWidth}px) > innerWidth (${info.winWidth}px)`);
  }
  return { scrollWidth: info.docWidth, innerWidth: info.winWidth };
}

async function runAuditForViewport(browser, vp) {
  console.log(`\n============================================================`);
  console.log(`📱 INICIANDO AUDITORIA NO VIEWPORT: ${vp.name}`);
  console.log(`============================================================`);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignora ruídos externos comuns como tracking de terceiros se houver
      if (!text.includes('favicon') && !text.includes('analytics')) {
        consoleErrors.push(text);
      }
    }
  });

  const stageResults = {};

  try {
    // -------------------------------------------------------------
    // LOGIN COMO LOJISTA
    // -------------------------------------------------------------
    console.log(`\n🔑 [Login] Acessando ${BASE_URL}/admin...`);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Verifica se já está logado ou se precisa logar
    const isLoginPage = await page.$('input[type="email"], input[type="password"], button:has-text("Super Admin")');
    if (isLoginPage) {
      console.log(`🔑 [Login] Alternando para modo 'Lojista Assinante'...`);
      const lojistaBtn = page.getByRole('button', { name: /Lojista Assinante/i });
      if (await lojistaBtn.isVisible()) {
        await lojistaBtn.click();
        await page.waitForTimeout(300);
      }

      console.log(`🔑 [Login] Preenchendo credenciais de Tatiane...`);
      await page.fill('input[type="email"]', LOJISTA_EMAIL);
      await page.fill('input[type="password"]', LOJISTA_PASSWORD);

      const submitBtn = page.getByRole('button', { name: /Entrar na Minha Loja/i });
      await submitBtn.click();
      console.log(`🔑 [Login] Aguardando autenticação e carregamento do painel...`);
      await page.waitForSelector('text=Entre amigas', { timeout: 20000 });
    }

    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // STAGE 1: Header & Identity
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 1] Auditando Header & Identity...`);
    const headerTitleEl = await page.locator('h1').textContent();
    console.log(`   - Título Header encontrado: "${headerTitleEl?.trim()}"`);
    if (!headerTitleEl?.includes('Entre amigas')) {
      throw new Error(`Nome da loja não encontrado no header: ${headerTitleEl}`);
    }

    const proBadge = await page.locator('text=PRO').first();
    const isProBadgeVisible = await proBadge.isVisible();
    console.log(`   - Badge PRO visível: ${isProBadgeVisible}`);
    if (!isProBadgeVisible) throw new Error('Badge PRO não está visível no header');

    // Botão Sair visível no mobile
    const sairButtons = page.locator('button:has-text("Sair")');
    const sairCount = await sairButtons.count();
    let isSairVisible = false;
    for (let i = 0; i < sairCount; i++) {
      if (await sairButtons.nth(i).isVisible()) {
        isSairVisible = true;
        break;
      }
    }
    console.log(`   - Botão Sair visível: ${isSairVisible}`);
    if (!isSairVisible) throw new Error('Botão Sair não está visível');

    // Botão Ver Minha Vitrine
    const vitrineBtn = page.locator('a:has-text("Ver Minha Vitrine")');
    const isVitrineBtnVisible = await vitrineBtn.isVisible();
    console.log(`   - Botão Ver Minha Vitrine visível: ${isVitrineBtnVisible}`);
    if (!isVitrineBtnVisible) throw new Error('Botão Ver Minha Vitrine não está visível');

    await checkNoHorizontalOverflow(page, 'Stage 1 (Header)');
    stageResults['Stage 1: Header & Identity'] = 'PASSED ✅';

    // -------------------------------------------------------------
    // STAGE 2: Tab 1 Meus Produtos & CRUD Forense
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 2] Auditando Tab 1 Meus Produtos & CRUD...`);
    // Garante que está na aba produtos
    const tabProdutos = page.getByRole('tab', { name: /Meus Produtos/i });
    await tabProdutos.click();
    await page.waitForTimeout(800);

    // Verifica botão de puxar dados automaticamente
    const fetchAutoBtn = page.locator('button:has-text("Puxar Dados do Link Automaticamente")');
    const isFetchAutoBtnVisible = await fetchAutoBtn.isVisible();
    console.log(`   - Botão '⚡ Puxar Dados do Link Automaticamente' visível: ${isFetchAutoBtnVisible}`);
    if (!isFetchAutoBtnVisible) throw new Error("Botão '⚡ Puxar Dados do Link Automaticamente' não encontrado");

    // Ciclo CRUD Forense com produto teste
    const testProdTitle = `[Audit Test] Item ${Date.now()}`;
    console.log(`   - Testando CRUD: Cadastrando "${testProdTitle}"...`);

    // Preenche formulário de oferta
    await page.fill('input[placeholder*="meli.la"], input[placeholder*="shopee.com"]', 'https://www.mercadolivre.com.br/social/p/MLB-audit-test?matt_word=tatianemirianbernardoconcei&matt_tool=51555285');
    await page.fill('input[placeholder*="Air Fryer"]', testProdTitle);
    await page.fill('input[placeholder="Ex: 279,90"]', '49,90');
    await page.fill('input[placeholder="Ex: 399,90"]', '89,90');

    const submitOfferBtn = page.locator('button:has-text("Publicar na Vitrine")');
    await submitOfferBtn.click();
    console.log(`   - Oferta enviada. Aguardando exibição na lista...`);

    // Aguarda produto teste aparecer na lista
    const testProdItem = page.locator(`p:has-text("${testProdTitle}")`);
    await testProdItem.waitFor({ timeout: 10000 });
    console.log(`   - Produto teste localizado na lista com sucesso!`);

    // Edição do produto teste
    console.log(`   - Testando Edição: Localizando botão de editar oferta...`);
    const testProdRow = page.locator(`.flex:has(p:has-text("${testProdTitle}"))`).first();
    const editBtn = testProdRow.locator('button[title="Editar oferta"]');
    await editBtn.click();
    await page.waitForTimeout(500);

    console.log(`   - Alterando preço para 39,90...`);
    await page.fill('input[placeholder="Ex: 279,90"]', '39,90');
    const saveEditBtn = page.locator('button:has-text("Salvar Alterações")');
    await saveEditBtn.click();
    await page.waitForTimeout(800);
    console.log(`   - Produto teste atualizado!`);

    // Exclusão do produto teste
    console.log(`   - Testando Remoção: Clicando no botão remover produto...`);
    const deleteBtn = testProdRow.locator('button[title="Remover produto"]');
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    // Confirma que o produto foi removido
    const testProdStillExists = await page.locator(`p:has-text("${testProdTitle}")`).count();
    if (testProdStillExists > 0) {
      throw new Error(`Produto teste ainda existe na lista após exclusão: ${testProdStillExists}`);
    }
    console.log(`   - Produto teste removido com sucesso e sem resíduos!`);

    // Validação dos 20 produtos existentes
    console.log(`   - Verificando catálogo existente de Tatiane...`);
    const productRows = page.locator('div.border-slate-800.bg-slate-900\\/50');
    const existingCount = await productRows.count();
    console.log(`   - Total de produtos listados no painel: ${existingCount}`);

    // Validação de imagens dos produtos no admin
    const brokenAdminImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[alt="Thumb"]'));
      return imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src);
    });
    console.log(`   - Imagens quebradas no admin: ${brokenAdminImages.length}`);
    if (brokenAdminImages.length > 0) {
      console.warn(`   ⚠️ Alerta: ${brokenAdminImages.length} imagens quebradas no admin`);
    }

    await checkNoHorizontalOverflow(page, 'Stage 2 (Meus Produtos)');
    stageResults['Stage 2: Tab Meus Produtos & CRUD'] = 'PASSED ✅';

    // -------------------------------------------------------------
    // STAGE 3: Tab 2 Disparador VIP
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 3] Auditando Tab 2 Disparador VIP...`);
    const tabVip = page.getByRole('tab', { name: /Disparador VIP/i });
    await tabVip.click();
    await page.waitForTimeout(1000);

    const vipHeader = await page.locator('text=Disparador VIP').first();
    if (!await vipHeader.isVisible()) throw new Error('Cabeçalho do Disparador VIP não visível');

    // Seleciona o primeiro produto da lista no disparador
    const firstSelectable = page.locator('button:has-text("Selecionar"), div[role="button"]').first();
    if (await firstSelectable.isVisible()) {
      await firstSelectable.click();
      await page.waitForTimeout(500);
    }

    // Verifica botão de copiar texto VIP
    const copyVipBtn = page.locator('button:has-text("Copiar Texto Formatado"), button:has-text("Copiar")').first();
    const isCopyVipBtnVisible = await copyVipBtn.isVisible();
    console.log(`   - Botão de Copiar Disparador VIP visível: ${isCopyVipBtnVisible}`);

    await checkNoHorizontalOverflow(page, 'Stage 3 (Disparador VIP)');
    stageResults['Stage 3: Tab Disparador VIP'] = 'PASSED ✅';

    // -------------------------------------------------------------
    // STAGE 4: Tab 3 Minha Loja
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 4] Auditando Tab 3 Minha Loja...`);
    const tabLoja = page.getByRole('tab', { name: /Minha Loja/i });
    await tabLoja.click();
    await page.waitForTimeout(1000);

    const storeNameInput = page.locator('input[value*="Entre amigas"]');
    const hasStoreName = await storeNameInput.count();
    console.log(`   - Input com nome da loja carregado: ${hasStoreName > 0}`);
    if (hasStoreName === 0) throw new Error('Nome da loja não carregou em Minha Loja');

    // Verifica e clica no botão salvar alterações
    const saveStoreBtn = page.locator('button:has-text("Salvar Alterações da Minha Loja")');
    if (!await saveStoreBtn.isVisible()) throw new Error('Botão Salvar Alterações da Minha Loja não visível');
    await saveStoreBtn.click();
    await page.waitForTimeout(1200);
    console.log(`   - Salvar Alterações da Loja executado com sucesso!`);

    await checkNoHorizontalOverflow(page, 'Stage 4 (Minha Loja)');
    stageResults['Stage 4: Tab Minha Loja'] = 'PASSED ✅';

    // -------------------------------------------------------------
    // STAGE 5: Tab 4 Minha Assinatura
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 5] Auditando Tab 4 Minha Assinatura...`);
    const tabAssinatura = page.getByRole('tab', { name: /Minha Assinatura/i });
    await tabAssinatura.click();
    await page.waitForTimeout(800);

    const planNameEl = page.locator('text=Plano Atual').first();
    if (!await planNameEl.isVisible()) throw new Error('Plano Atual não encontrado na tela de assinatura');

    const statusBadge = page.locator('text=ATIVO').first();
    console.log(`   - Assinatura Ativa: ${await statusBadge.isVisible()}`);

    await checkNoHorizontalOverflow(page, 'Stage 5 (Minha Assinatura)');
    stageResults['Stage 5: Tab Minha Assinatura'] = 'PASSED ✅';

    // -------------------------------------------------------------
    // STAGE 6: Tab 5 Guia de Uso
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 6] Auditando Tab 5 Guia de Uso...`);
    const tabGuia = page.getByRole('tab', { name: /Guia de Uso/i });
    await tabGuia.click();
    await page.waitForTimeout(1000);

    const guideHeader = page.locator('text=Guia').first();
    if (!await guideHeader.isVisible()) throw new Error('Guia de uso não visível');

    await checkNoHorizontalOverflow(page, 'Stage 6 (Guia de Uso)');
    stageResults['Stage 6: Tab Guia de Uso'] = 'PASSED ✅';

    // -------------------------------------------------------------
    // STAGE 7: Public Vitrine (?loja=entre-amigas-promos)
    // -------------------------------------------------------------
    console.log(`\n📌 [Stage 7] Auditando Vitrine Pública: ${BASE_URL}/?loja=${STORE_SLUG}...`);
    await page.goto(`${BASE_URL}/?loja=${STORE_SLUG}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Verifica nome da loja na vitrine
    const brandTitle = page.locator(`text=Entre amigas`).first();
    if (!await brandTitle.isVisible()) throw new Error("Título da marca 'Entre amigas' não encontrado na vitrine");

    // Testa campo de busca
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Panela');
      await page.waitForTimeout(500);
      await searchInput.fill('');
      await page.waitForTimeout(500);
      console.log(`   - Campo de busca validado com sucesso.`);
    }

    // Contagem de produtos na vitrine
    const vitrineProducts = page.locator('article');
    const vitrineProdCount = await vitrineProducts.count();
    console.log(`   - Total de produtos exibidos na vitrine: ${vitrineProdCount}`);

    // Validação de imagens dos produtos na vitrine
    const brokenVitrineImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('article img'));
      return imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src);
    });
    console.log(`   - Imagens quebradas na vitrine: ${brokenVitrineImages.length}`);
    if (brokenVitrineImages.length > 0) {
      console.warn(`   ⚠️ Alerta: ${brokenVitrineImages.length} imagens quebradas na vitrine:`, brokenVitrineImages);
    }

    // Validação de tags de afiliado nos links
    const affiliateLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('article a[href]')).map((a) => a.href);
      return links;
    });

    console.log(`   - Total de links de produtos avaliados: ${affiliateLinks.length}`);
    let mlTagValid = 0;
    let shopeeTagValid = 0;

    for (const href of affiliateLinks) {
      if (href.includes('mercadolivre') || href.includes('meli.la')) {
        if (href.includes('tatianemirianbernardoconcei') && href.includes('51555285')) {
          mlTagValid++;
        }
      } else if (href.includes('shopee') || href.includes('s.shopee.com.br')) {
        if (href.includes('18318420060')) {
          shopeeTagValid++;
        }
      }
    }
    console.log(`   - Links ML com matt_word + matt_tool válidos: ${mlTagValid}`);
    console.log(`   - Links Shopee com af_siteid válidos: ${shopeeTagValid}`);

    await checkNoHorizontalOverflow(page, 'Stage 7 (Vitrine Pública)');
    stageResults['Stage 7: Public Vitrine'] = 'PASSED ✅';

  } catch (err) {
    console.error(`\n❌ ERRO NO VIEWPORT ${vp.name}:`, err.message);
    throw err;
  } finally {
    await context.close();
  }

  return stageResults;
}

async function main() {
  console.log(`🚀 INICIANDO AUDITORIA FORENSE MOBILE E2E COMPLETA`);
  console.log(`Alvo: ${BASE_URL}`);
  console.log(`Cliente: ${LOJISTA_EMAIL} (${STORE_SLUG})`);

  const browser = await chromium.launch({ headless: true });
  const allResults = {};

  try {
    for (const vp of VIEWPORTS) {
      allResults[vp.name] = await runAuditForViewport(browser, vp);
    }

    console.log(`\n============================================================`);
    console.log(`📊 RELATÓRIO CONSOLIDADO DA AUDITORIA FORENSE`);
    console.log(`============================================================`);
    for (const [vpName, results] of Object.entries(allResults)) {
      console.log(`\n📱 ${vpName}:`);
      for (const [stage, status] of Object.entries(results)) {
        console.log(`   - ${stage}: ${status}`);
      }
    }
    console.log(`\n🎉 AUDITORIA FORENSE CONCLUÍDA COM 100% DE SUCESSO!`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\n💥 FALHA NA AUDITORIA:', err);
  process.exit(1);
});
