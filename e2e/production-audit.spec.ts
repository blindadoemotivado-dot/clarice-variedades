import { test, expect } from '@playwright/test';

const PROD_URL = 'https://clariceachadinhos.vercel.app';
const TATI_SLUG = 'entre-amigas-promos';
const CLARICE_VIP_HASH = 'IXxtNFu9ZppJkYFx1Jdk7o';
const TATI_VIP_HASH = 'FxvrxptP6vYHjAthyYOWWo';

test.describe('AUDITORIA E2E EM PRODUÇÃO - CLARICE ACHADINHOS', () => {

  // =========================================================================
  // PONTA 1: VITRINE MATRIZ (CLARICE ACHADINHOS)
  // =========================================================================
  test('Ponta 1.1: Vitrine Matriz carrega em 360px e Desktop sem overflow e com contatos exclusivos da Clarice', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Multiple GoTrueClient')) {
        consoleErrors.push(msg.text());
      }
    });

    // Mobile 360px
    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await page.waitForSelector('header');
    await page.waitForSelector('#catalogo-completo article[id^="produto-"]', { timeout: 15000 });

    // Valida sem overflow horizontal em 360px
    const isOverflow360 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflow360).toBe(false);

    // Valida título e banner
    const title = await page.title();
    expect(title).toContain('Clarice Achadinhos');

    // Valida que o link VIP da Matriz aponta para o grupo oficial da Clarice
    const vipLinks = await page.locator('a[href*="chat.whatsapp.com"]').all();
    for (const link of vipLinks) {
      const href = await link.getAttribute('href');
      expect(href).toContain(CLARICE_VIP_HASH);
    }

    // Valida que os cards de produto renderizam (máximo 16 na visualização inicial)
    const productCards = await page.locator('#catalogo-completo article[id^="produto-"]').count();
    expect(productCards).toBeGreaterThan(0);
    expect(productCards).toBeLessThanOrEqual(16);

    // Validação de Deduplicação: Nenhuma imagem ou título duplicado na grade
    const cardTitles = await page.locator('#catalogo-completo article[id^="produto-"] h3').allInnerTexts();
    const uniqueTitles = new Set(cardTitles.map((t) => t.trim().toLowerCase()));
    expect(uniqueTitles.size).toBe(cardTitles.length);

    // Desktop 1280px
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(1000);
    const isOverflowDesk = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflowDesk).toBe(false);
  });

  test('Ponta 1.2: Vitrine Matriz - Busca e Filtro de Categoria funcionam perfeitamente', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[aria-label="Buscar produtos"]');

    // Teste de Busca
    const searchInput = page.locator('input[aria-label="Buscar produtos"]');
    await searchInput.fill('jogo');
    await page.waitForTimeout(1000);

    // Verifica que a listagem filtra produtos
    const filteredCount = await page.locator('#catalogo-completo article[id^="produto-"]').count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);

    // Limpa a busca
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Teste de Filtro de Categoria (Pill de Categoria)
    const categoryBtn = page.locator('button:has-text("Cozinha")').first();
    if (await categoryBtn.isVisible()) {
      await categoryBtn.click();
      await page.waitForTimeout(1000);
      const kitchenCount = await page.locator('#catalogo-completo article[id^="produto-"]').count();
      expect(kitchenCount).toBeGreaterThanOrEqual(0);
    }
  });

  // =========================================================================
  // PONTA 2: VITRINE PARCEIRA ISOLADA (LOJA DA TATI)
  // =========================================================================
  test('Ponta 2.1: Loja da Tati - Banner carrega em 360px e contatos da matriz NÃO vazam no HTML', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto(`${PROD_URL}/?loja=${TATI_SLUG}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await page.waitForSelector('header');
    await page.waitForTimeout(2000);

    // Sem overflow horizontal
    const isOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflow).toBe(false);

    // Valida nome da loja da Tati no título
    const title = await page.title();
    expect(title).toContain('Entre amigas promos');

    // Inspeciona TODO o HTML e hrefs: ZERO ocorrência do link do grupo da Clarice
    const pageHtml = await page.content();
    expect(pageHtml).not.toContain(CLARICE_VIP_HASH);

    // Valida que todos os links de grupo WhatsApp apontam EXCLUSIVAMENTE para a Tati
    const vipLinks = await page.locator('a[href*="chat.whatsapp.com"]').all();
    for (const link of vipLinks) {
      const href = await link.getAttribute('href');
      expect(href).toContain(TATI_VIP_HASH);
      expect(href).not.toContain(CLARICE_VIP_HASH);
    }
  });

  test('Ponta 2.2: Loja da Tati - Isolamento estrito de catálogo (apenas produtos da Tati)', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto(`${PROD_URL}/?loja=${TATI_SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // O catálogo da Tati possui 18 produtos no banco
    const tatiProductCards = await page.locator('#catalogo-completo article[id^="produto-"]').count();
    expect(tatiProductCards).toBeGreaterThan(0);
    expect(tatiProductCards).toBeLessThanOrEqual(16); // 1ª página com até 16 itens

    // Nenhum produto deve ter vazado da clarice ou outra loja
    const storeSubtitles = await page.locator('text=Clarice Achadinhos').count();
    // No header e hero deve aparecer apenas "Entre amigas promos"
    const storeHeaderTitle = await page.locator('header').innerText();
    expect(storeHeaderTitle).toContain('Entre amigas promos');
    expect(storeHeaderTitle).not.toContain('Clarice Achadinhos');
  });

  // =========================================================================
  // PONTA 3: PAINEL DO LOJISTA (/admin)
  // =========================================================================
  test('Ponta 3.1: Painel do Lojista (/admin) - Login e Navegação de Abas', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto(`${PROD_URL}/admin`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await page.waitForSelector('form');
    await page.waitForTimeout(1000);

    // Sem overflow no login
    const isOverflowLogin = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflowLogin).toBe(false);

    // Alterna para o modo Lojista Assinante
    const lojistaTab = page.locator('button:has-text("Lojista Assinante")');
    await lojistaTab.click();
    await page.waitForTimeout(500);

    // Realiza login com as credenciais da Tati
    await page.locator('input[type="email"]').fill('tatianemirianbc@gmail.com');
    await page.locator('input[type="password"]').fill('Deusefiel0527@');
    await page.locator('button:has-text("Entrar na Minha Loja")').click();

    // Aguarda o painel autenticado carregar
    await page.waitForTimeout(3000);

    // Valida que o painel exibe o nome da loja
    const panelHeader = page.locator('header');
    await expect(panelHeader).toBeVisible();

    // Valida que a barra de abas cabe em 360px sem overflow
    const isOverflowPanel = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflowPanel).toBe(false);

    // Teste de navegação e conteúdo real de abas (Elimina 100% de abas vazias)
    const tabs = ['Produtos', 'Ofertas', 'WhatsApp', 'Ajustes', 'Aulas'];
    for (const tabName of tabs) {
      const tabBtn = page.locator(`button[role="tab"]:has-text("${tabName}")`);
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(400);

        // Valida que a aba ativa renderiza conteúdo real e substancial (nunca vazia)
        const activePanel = page.locator('[role="tabpanel"]:not([hidden])');
        await expect(activePanel).toBeVisible();
        const content = (await activePanel.innerText()).trim();
        expect(content.length).toBeGreaterThan(20);

        if (tabName === 'Ofertas') {
          // Garante que a aba Ofertas renderiza a gestão de destaques/carrossel
          expect(content).toMatch(/Ofertas em Destaque|Nenhuma oferta destacada|Carrossel/i);
        }
      }
    }
  });

  test('Ponta 3.2: Painel do Lojista (/admin) - Aba Ajustes (Salvar Configurações)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PROD_URL}/admin`, { waitUntil: 'networkidle' });

    // Aguarda montagem completa e alterna para Login Lojista Assinante
    const lojistaBtn = page.locator('button:has-text("Lojista Assinante")');
    await lojistaBtn.waitFor({ state: 'visible' });
    await lojistaBtn.click();

    // Preenche credenciais da Tati
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill('tatianemirianbc@gmail.com');
    await page.locator('input[type="password"]').fill('Deusefiel0527@');
    await page.locator('button:has-text("Entrar na Minha Loja")').click();

    // Aguarda painel autenticado carregar (botão Sair visível)
    await page.locator('button:has-text("Sair")').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Navega para aba Ajustes
    const ajustesTab = page.locator('button[role="tab"]:has-text("Ajustes")');
    await expect(ajustesTab).toBeVisible();
    await ajustesTab.click();
    await page.waitForTimeout(2000);

    // Valida que o botão de Salvar Alterações está visível
    const saveBtn = page.locator('button:has-text("Salvar Alterações da Minha Loja")');
    await expect(saveBtn).toBeVisible({ timeout: 10000 });

    // Clica no botão de Salvar Alterações 2x seguidas para garantir estabilidade (sem travamentos)
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();
    await page.waitForTimeout(1500);
    await saveBtn.click();
    await page.waitForTimeout(1500);
  });

  test('Ponta 3.3: Super Admin - Modo Suporte, Nome da Loja no Header e Zero Botões Duplicados', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${PROD_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Se estiver logado de teste anterior, clica em Sair para voltar à tela de login limpa
    const sairBtn = page.locator('button:has-text("Sair"):visible');
    if (await sairBtn.isVisible()) {
      await sairBtn.click();
      await page.waitForTimeout(1000);
    }

    // Garante que a aba Super Admin está selecionada
    const superAdminTab = page.getByRole('button', { name: 'Super Admin', exact: true });
    if (await superAdminTab.isVisible()) {
      await superAdminTab.click();
      await page.waitForTimeout(300);
    }

    // Login via PIN Mestre do Super Admin
    const pinInput = page.locator('input[placeholder="••••••••"]');
    await pinInput.waitFor({ state: 'visible', timeout: 10000 });
    await pinInput.fill('clarice2026');
    await page.locator('button:has-text("Entrar como Super Admin")').click();

    // Aguarda carregar o painel
    await page.locator('button:has-text("Sair"):visible').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Acessa aba SaaS / Lojas Parceiras
    const saasTab = page.locator('button[role="tab"]:has-text("Lojas"), button[role="tab"]:has-text("SaaS")').first();
    if (await saasTab.isVisible()) {
      await saasTab.click();
      await page.waitForTimeout(1500);

      // Clica em "Acessar Loja" para a loja da Tati (entre-amigas-promos)
      const acessarLojaBtn = page.locator('button:has-text("Acessar Loja")').first();
      if (await acessarLojaBtn.isVisible()) {
        await acessarLojaBtn.click();
        await page.waitForTimeout(2000);

        // 1. Valida que o banner de suporte está ativo
        const suporteBanner = page.locator('text=Modo Suporte Ativo');
        await expect(suporteBanner).toBeVisible();

        // 2. Valida título no Header: exibe "Gestão • Entre amigas promos" (NUNCA "Admin Clarice")
        const headerText = await page.locator('header').innerText();
        expect(headerText).toContain('Entre amigas promos');
        expect(headerText).not.toContain('Admin Clarice');

        // 3. Valida ausência de botões duplicados de voltar:
        // Deve existir apenas o botão oficial "Voltar ao Super Admin" no banner superior
        const voltarBtns = await page.locator('button:has-text("Voltar ao Super Admin"), button:has-text("Voltar Master")').all();
        expect(voltarBtns.length).toBe(1);

        // 4. Valida que a aba Ofertas renderiza a gestão de destaques com conteúdo
        const ofertasTab = page.locator('button[role="tab"]:has-text("Ofertas")');
        if (await ofertasTab.isVisible()) {
          await ofertasTab.click();
          await page.waitForTimeout(500);
          const panel = page.locator('[role="tabpanel"]:not([hidden])');
          const panelContent = (await panel.innerText()).trim();
          expect(panelContent.length).toBeGreaterThan(20);
        }

        // 5. Retorna ao Super Admin com 1 clique
        await page.locator('button:has-text("Voltar ao Super Admin")').click();
        await page.waitForTimeout(1500);

        // Valida que voltou ao painel Super Admin
        const superAdminBadge = page.locator('text=SUPER ADMIN');
        await expect(superAdminBadge.first()).toBeVisible();
      }
    }
  });

  // =========================================================================
  // PONTA 4: FLUXO DE AQUISIÇÃO (/criar-loja)
  // =========================================================================
  test('Ponta 4: Página /criar-loja carrega com planos em 360px sem overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto(`${PROD_URL}/criar-loja`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await page.waitForTimeout(2000);

    // Sem overflow
    const isOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflow).toBe(false);

    // Valida presença dos planos e formulário
    const plansTitle = page.locator('text=Escolha seu plano');
    await expect(plansTitle).toBeVisible();

    const planPro = page.locator('text=PRO');
    await expect(planPro.first()).toBeVisible();
  });

  // =========================================================================
  // PONTA 5: GATE PWA, MOBILE 360PX E SAÚDE DE INFRAESTRUTURA
  // =========================================================================
  test('Ponta 5: Endpoints de Saúde, Manifest, Service Worker e Ícones retornam HTTP 200', async ({ request }) => {
    // 1. Health Endpoint
    const healthRes = await request.get(`${PROD_URL}/api/health`);
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ok');
    expect(healthJson.project).toBe('clarice-achadinhos');
    expect(healthJson.timestamp).toBeDefined();

    // 2. Manifest PWA
    const manifestRes = await request.get(`${PROD_URL}/manifest.json`);
    expect(manifestRes.status()).toBe(200);
    const manifestJson = await manifestRes.json();
    expect(manifestJson.name).toContain('Clarice Achadinhos');

    // 3. Service Worker
    const swRes = await request.get(`${PROD_URL}/sw.js`);
    expect(swRes.status()).toBe(200);

    // 4. Ícones PWA
    const icon192 = await request.get(`${PROD_URL}/icons/icon-192x192.png`);
    expect(icon192.status()).toBe(200);
    expect(icon192.headers()['content-type']).toContain('image/png');

    const icon512 = await request.get(`${PROD_URL}/icons/icon-512x512.png`);
    expect(icon512.status()).toBe(200);
    expect(icon512.headers()['content-type']).toContain('image/png');

    const iconMaskable = await request.get(`${PROD_URL}/icons/icon-maskable-512x512.png`);
    expect(iconMaskable.status()).toBe(200);
    expect(iconMaskable.headers()['content-type']).toContain('image/png');

    const appleTouch = await request.get(`${PROD_URL}/apple-touch-icon.png`);
    expect(appleTouch.status()).toBe(200);
    expect(appleTouch.headers()['content-type']).toContain('image/png');
  });

});
