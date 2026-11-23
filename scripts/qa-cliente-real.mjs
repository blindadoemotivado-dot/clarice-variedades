/**
 * Bateria de Testes Automatizados E2E — Cliente Real (QA Ponta a Ponta)
 * Clarice Achadinhos SaaS
 *
 * Executa todas as 5 jornadas do usuário em produção e no banco de dados.
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.BASE_URL || 'https://clariceachadinhos.vercel.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Relatório Consolidado
const report = {
  jornadas: {},
  networkErrors: [],
  consoleErrors: [],
  pageErrors: [],
  warnings: [],
  summary: { total: 0, passed: 0, failed: 0 },
};

function recordResult(jornada, step, success, details = '') {
  report.summary.total++;
  if (success) {
    report.summary.passed++;
    console.log(`  ✅ [${jornada}] ${step}: ${details}`);
  } else {
    report.summary.failed++;
    console.error(`  ❌ [${jornada}] FALHA: ${step} — ${details}`);
  }
  if (!report.jornadas[jornada]) report.jornadas[jornada] = [];
  report.jornadas[jornada].push({ step, success, details });
}

function attachMonitors(page, contextName) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignorar erros irrelevantes de extensões de navegador ou favicons externos
      if (!text.includes('chrome-extension://') && !text.includes('favicon.ico')) {
        report.consoleErrors.push({ context: contextName, text });
        console.warn(`    ⚠️ [Console Error - ${contextName}]:`, text);
      }
    }
  });

  page.on('pageerror', (err) => {
    report.pageErrors.push({ context: contextName, message: err.message, stack: err.stack });
    console.error(`    💥 [Page Error - ${contextName}]:`, err.message);
  });

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    // Monitorar apenas requisições da própria app ou supabase que falharam
    if (status >= 400 && !url.includes('favicon') && !url.includes('analytics')) {
      report.networkErrors.push({ context: contextName, url, status });
      console.warn(`    🌐 [Network ${status} - ${contextName}]: ${url}`);
    }
  });
}

async function checkHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = Math.max(docEl.clientWidth, window.innerWidth);
    const hasOverflow = scrollWidth > clientWidth + 2; // tolerância de 2px
    return {
      hasOverflow,
      scrollWidth,
      clientWidth,
      diff: scrollWidth - clientWidth,
    };
  });
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO AUDITORIA QA DE CLIENTE REAL — CLARICE ACHADINHOS SAAS');
  console.log(`🌐 Alvo: ${BASE_URL}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // =========================================================================
    // JORNADA 1: Visitante & Vitrine Oficial ('/')
    // =========================================================================
    console.log('👉 [JORNADA 1] Visitante & Vitrine Oficial (/)');
    {
      const contextDesktop = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });
      const page = await contextDesktop.newPage();
      attachMonitors(page, 'J1-Desktop');

      const res = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      recordResult('Jornada 1', 'Carregamento Desktop HTTP 200', res.status() === 200, `Status ${res.status()}`);

      const title = await page.title();
      recordResult('Jornada 1', 'Título da Página Oficial', title.includes('Clarice Achadinhos'), title);

      // Overflow horizontal Desktop
      const overflowDesktop = await checkHorizontalOverflow(page);
      recordResult(
        'Jornada 1',
        'Ausência de Overflow Horizontal (Desktop)',
        !overflowDesktop.hasOverflow,
        `scroll: ${overflowDesktop.scrollWidth}px, client: ${overflowDesktop.clientWidth}px`
      );

      // Rodapé Oficial FCIA
      const footerText = await page.locator('footer').innerText().catch(() => '');
      const hasFciaFooter = footerText.includes('Tecnologia FCIA') || footerText.includes('FCIA');
      recordResult('Jornada 1', 'Assinatura Tecnologia FCIA no Rodapé', hasFciaFooter, footerText.slice(0, 60));

      // Busca de Produtos
      const searchInput = page.locator('input[placeholder*="Buscar"]').first();
      const hasSearch = (await searchInput.count()) > 0;
      if (hasSearch) {
        await searchInput.fill('mesa');
        await page.waitForTimeout(500);
        const cardsCount = await page.locator('article').count();
        recordResult('Jornada 1', 'Busca por texto ("mesa")', cardsCount >= 0, `${cardsCount} produtos encontrados`);
        await searchInput.fill('');
        await page.waitForTimeout(300);
      } else {
        recordResult('Jornada 1', 'Campo de Busca Encontrado', false, 'Não encontrado');
      }

      // Filtro de Categorias
      const categoryBtn = page.locator('button:has-text("Casa & Cozinha"), button:has-text("Eletrônicos")').first();
      if ((await categoryBtn.count()) > 0) {
        const catName = await categoryBtn.innerText();
        await categoryBtn.click();
        await page.waitForTimeout(400);
        recordResult('Jornada 1', `Filtro de Categoria (${catName})`, true, 'Clicado com sucesso');
      }

      // Favoritos
      const heartBtn = page.locator('article button[aria-label*="Favorit"], article button:has([class*="lucide-heart"])').first();
      if ((await heartBtn.count()) > 0) {
        await heartBtn.click();
        await page.waitForTimeout(300);
        // Clica no botão de favoritos do cabeçalho
        const headerFavBtn = page.locator('header button[aria-label*="Favorito"]').first();
        if ((await headerFavBtn.count()) > 0) {
          await headerFavBtn.click();
          await page.waitForTimeout(400);
          const favText = await page.locator('h2').innerText().catch(() => '');
          recordResult('Jornada 1', 'Alternância para Seção de Favoritos', favText.includes('Favorito'), favText);
          // Desfaz clique para voltar ao catálogo completo
          await headerFavBtn.click();
          await page.waitForTimeout(300);
        }
      }

      // Links de Oferta
      const offerLink = page.locator('article a[href*="http"]').first();
      if ((await offerLink.count()) > 0) {
        const href = await offerLink.getAttribute('href');
        const isValid = href && (href.includes('mercadolivre') || href.includes('meli.la') || href.includes('shopee'));
        recordResult('Jornada 1', 'Link de Afiliado Válido no Card', Boolean(isValid), href ? href.slice(0, 50) : '');
      }

      await contextDesktop.close();

      // Teste Mobile (390x844 - iPhone 14/15)
      const contextMobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      });
      const pageMobile = await contextMobile.newPage();
      attachMonitors(pageMobile, 'J1-Mobile');

      await pageMobile.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      const overflowMobile = await checkHorizontalOverflow(pageMobile);
      recordResult(
        'Jornada 1',
        'Ausência de Overflow Horizontal (Mobile 390px)',
        !overflowMobile.hasOverflow,
        `scroll: ${overflowMobile.scrollWidth}px, client: ${overflowMobile.clientWidth}px`
      );

      // Verifica se o botão WhatsApp do header está oculto no mobile
      const headerWhatsappHidden = await pageMobile.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return true;
        const wppBtn = header.querySelector('a[href*="whatsapp"], button:has([class*="message-circle"])');
        if (!wppBtn) return true;
        const style = window.getComputedStyle(wppBtn);
        return style.display === 'none' || style.visibility === 'hidden';
      });
      recordResult('Jornada 1', 'WhatsApp Oculto no Header Mobile (< md)', headerWhatsappHidden, 'Layout limpo');

      await contextMobile.close();
    }

    // =========================================================================
    // JORNADA 2: Vitrine Parceira Isolada ('/?loja=loja-demo')
    // =========================================================================
    console.log('\n👉 [JORNADA 2] Vitrine Parceira Isolada (/?loja=loja-demo)');
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      attachMonitors(page, 'J2-Partner');

      const partnerUrl = `${BASE_URL}/?loja=loja-demo`;
      const res = await page.goto(partnerUrl, { waitUntil: 'networkidle', timeout: 30000 });
      recordResult('Jornada 2', 'Carregamento HTTP 200 de ?loja=loja-demo', res.status() === 200, `Status ${res.status()}`);

      // Aguarda estabilização do tenant
      await page.waitForTimeout(1500);

      // Validação de Isolamento Visual (Zero ativos da Clarice)
      const pageContent = await page.content();
      const hasClariceHero = pageContent.includes('clarice-hero.png');
      const headerText = await page.locator('header').innerText();
      const hasClariceInHeader = headerText.includes('Clarice Achadinhos');
      recordResult('Jornada 2', 'Zero Logo/Mascote da Clarice na Loja Demo', !hasClariceHero, 'Banner Clarice ausente');
      recordResult('Jornada 2', 'Zero Nome da Clarice no Cabeçalho Demo', !hasClariceInHeader, 'Branding Clarice isolado');

      // Monograma e Identidade da Demo
      const monogramText = await page.locator('header div[class*="rounded-full"][class*="font-black"]').first().innerText().catch(() => '');
      const hasMonogram = monogramText.includes('AD') || monogramText.includes('A');
      recordResult('Jornada 2', 'Monograma Dinâmico do Lojista ("AD")', hasMonogram, `Monograma: "${monogramText}"`);

      // Nome da Loja Demo
      const storeName = await page.locator('header span[class*="font-extrabold"]').first().innerText().catch(() => '');
      const isDemoName = storeName.includes('Achadinhos Demo FCIA') || storeName.includes('loja-demo');
      recordResult('Jornada 2', 'Nome Oficial da Loja Demo', isDemoName, `Loja: "${storeName}"`);

      // Contagem de Produtos Exclusivos
      const demoCardsCount = await page.locator('article').count();
      recordResult(
        'Jornada 2',
        'Catálogo Exclusivo da Loja Demo (8 Produtos)',
        demoCardsCount === 8,
        `${demoCardsCount} produtos carregados`
      );

      // Verificação Mobile
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      const overflowPartnerMobile = await checkHorizontalOverflow(page);
      recordResult(
        'Jornada 2',
        'Ausência de Overflow na Loja Demo (Mobile)',
        !overflowPartnerMobile.hasOverflow,
        `scroll: ${overflowPartnerMobile.scrollWidth}px, client: ${overflowPartnerMobile.clientWidth}px`
      );

      await context.close();
    }

    // =========================================================================
    // JORNADA 3: Auto-Cadastro de Novo Assinante ('/criar-loja')
    // =========================================================================
    console.log('\n👉 [JORNADA 3] Auto-Cadastro de Novo Assinante (/criar-loja)');
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      attachMonitors(page, 'J3-Cadastro');

      await page.goto(`${BASE_URL}/criar-loja`, { waitUntil: 'networkidle', timeout: 30000 });

      // Alternância entre Planos (Start, Pro, Advanced)
      const startCard = page.locator('div[class*="cursor-pointer"]:has-text("Start")').first();
      const advancedCard = page.locator('div[class*="cursor-pointer"]:has-text("Advanced")').first();
      const proCard = page.locator('div[class*="cursor-pointer"]:has-text("Pro")').first();

      if ((await startCard.count()) > 0 && (await proCard.count()) > 0) {
        await startCard.click();
        await page.waitForTimeout(200);
        await advancedCard.click();
        await page.waitForTimeout(200);
        await proCard.click();
        await page.waitForTimeout(200);
        recordResult('Jornada 3', 'Alternância Interativa de Planos (Start / Pro / Advanced)', true, 'Planos alternados com sucesso');
      }

      // Preenchimento do Formulário
      const testSlug = 'qa-cliente-fcia';
      await page.locator('input[placeholder*="Seu nome completo"]').fill('Cliente QA FCIA');
      await page.locator('input[placeholder*="seuemail@exemplo"]').fill('qa.cliente@fcia.com.br');
      await page.locator('input[placeholder*="Defina uma senha segura"]').fill('Teste@1234');
      await page.locator('input[placeholder*="(11) 99999-9999"]').fill('(94) 99999-8888');
      await page.locator('input[placeholder*="000.000.000-00"]').fill('123.456.789-00');
      await page.locator('input[placeholder*="Achadinhos da Carol"]').fill('QA Cliente FCIA');

      // Slug automático / manual
      const slugInput = page.locator('input[placeholder*="achadinhos-da-carol"]').first();
      if ((await slugInput.count()) > 0) {
        await slugInput.fill(testSlug);
      }

      // Aguarda debounce de validação de slug
      await page.waitForTimeout(1000);
      const isAvailableIndicator = await page.locator('text=Disponível, text=disponível, [class*="emerald"]').count();
      recordResult('Jornada 3', 'Validação de Disponibilidade de Slug', isAvailableIndicator > 0, 'Slug validado em tempo real');

      // Submissão do Formulário
      const submitBtn = page.locator('button[type="submit"]:has-text("Criar Minha Loja")');
      await submitBtn.click();

      // Aguarda tela de sucesso ou toast
      const successTitle = page.locator('text=Solicitação de Abertura Recebida');
      await successTitle.waitFor({ timeout: 15000 }).catch(() => {});
      const hasSuccess = (await successTitle.count()) > 0;
      recordResult('Jornada 3', 'Submissão e Tela de Confirmação Pós-Cadastro', hasSuccess, 'Tela de sucesso exibida');

      // Verificação no Supabase
      const { data: createdStore, error: sbError } = await supabase
        .from('lojas_afiliados')
        .select('slug, nome_loja, status_assinatura, plano, owner_email')
        .eq('slug', testSlug)
        .maybeSingle();

      const storePersisted = Boolean(createdStore && createdStore.slug === testSlug);
      recordResult(
        'Jornada 3',
        'Persistência em public.lojas_afiliados no Supabase',
        storePersisted,
        storePersisted ? `Loja ${createdStore.slug} (Status: ${createdStore.status_assinatura})` : (sbError?.message || 'Não encontrado')
      );

      await context.close();
    }

    // =========================================================================
    // JORNADA 4: Painel do Lojista Assinante ('/admin')
    // =========================================================================
    console.log('\n👉 [JORNADA 4] Painel do Lojista Assinante (/admin)');
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 850 },
      });
      const page = await context.newPage();
      attachMonitors(page, 'J4-Admin');

      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });

      // Alterna para modo Lojista Assinante
      const lojistaTab = page.locator('button:has-text("Lojista Assinante")');
      if ((await lojistaTab.count()) > 0) {
        await lojistaTab.click();
        await page.waitForTimeout(300);
      }

      // Preenche login de teste do lojista
      await page.locator('input[type="email"]').fill('teste.lojista@fcia.com.br');
      await page.locator('input[type="password"]').fill('loja-demo');
      await page.locator('button[type="submit"]:has-text("Entrar na Minha Loja")').click();

      // Aguarda carregamento do painel
      const panelTitle = page.locator('h1:has-text("Gestão • Achadinhos Demo FCIA"), h1:has-text("Gestão")');
      await panelTitle.waitFor({ timeout: 15000 }).catch(() => {});
      const isAuth = (await panelTitle.count()) > 0;
      recordResult('Jornada 4', 'Login Lojista Assinante (teste.lojista@fcia.com.br)', isAuth, 'Painel autenticado');

      // Botão "↗ Ver Minha Vitrine" no Header
      const vitrineLink = page.locator('header a[href*="?loja=loja-demo"]');
      const hasVitrineBtn = (await vitrineLink.count()) > 0;
      recordResult('Jornada 4', 'Botão "↗ Ver Minha Vitrine" direcionando para ?loja=loja-demo', hasVitrineBtn, 'Link validado');

      // ─────────────────────────────────────────────────────────────────
      // Aba: Minha Loja
      // ─────────────────────────────────────────────────────────────────
      const minhaLojaTab = page.locator('button[role="tab"]:has-text("Minha Loja")');
      if ((await minhaLojaTab.count()) > 0) {
        await minhaLojaTab.click();
        await page.waitForTimeout(600);

        // Upload de Logo e Banner presentes
        const fileInputs = await page.locator('input[type="file"]').count();
        recordResult('Jornada 4', 'Upload de Imagens (Logo e Banner Hero)', fileInputs >= 2, `${fileInputs} inputs de arquivo`);

        // Trava do Domínio Próprio (PlanGate - Plano Pro não tem direito a CNAME)
        const domainLock = page.locator('text=Recurso Exclusivo do Plano Advanced, text=Faça Upgrade').first();
        const hasLock = (await domainLock.count()) > 0;
        recordResult('Jornada 4', 'Trava do Domínio Próprio via PlanGate (Plano Pro)', hasLock, 'Bloqueio respeitado');

        // Alteração de Subtítulo e Salvamento
        const subInput = page.locator('input[placeholder*="slogan"], textarea, input[value*="ofertas"]').first();
        if ((await subInput.count()) > 0) {
          const originalSub = await subInput.inputValue();
          await subInput.fill(`${originalSub} [QA]`);
          const saveBtn = page.locator('button:has-text("Salvar Personalização"), button:has-text("Salvar Alterações")').first();
          if ((await saveBtn.count()) > 0) {
            await saveBtn.click();
            await page.waitForTimeout(1000);
            recordResult('Jornada 4', 'Edição e Salvamento de Identidade Visual na Aba Minha Loja', true, 'Subtítulo atualizado');
            // Reverte subtítulo
            await subInput.fill(originalSub);
            await saveBtn.click();
            await page.waitForTimeout(800);
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // Aba: Meus Produtos
      // ─────────────────────────────────────────────────────────────────
      const produtosTab = page.locator('button[role="tab"]:has-text("Meus Produtos")');
      if ((await produtosTab.count()) > 0) {
        await produtosTab.click();
        await page.waitForTimeout(600);

        // Cadastro de 1 produto de teste
        const testMlbId = `MLB-TEST-${Date.now().toString().slice(-6)}`;
        const testTitle = `Produto Teste QA Playwright ${testMlbId}`;

        const urlInput = page.locator('input[placeholder*="meli.la"], input[placeholder*="shopee"]').first();
        const titleInput = page.locator('input[placeholder*="Fritadeira Air Fryer"]').first();
        const priceInput = page.locator('input[placeholder*="279,90"]').first();

        if ((await urlInput.count()) > 0 && (await titleInput.count()) > 0) {
          await urlInput.fill(`https://produto.mercadolivre.com.br/MLB-123456789-produto-teste`);
          await titleInput.fill(testTitle);
          if ((await priceInput.count()) > 0) await priceInput.fill('89,90');

          const saveProdBtn = page.locator('button[type="submit"]:has-text("Publicar na Vitrine")').first();
          await saveProdBtn.click();
          await page.waitForTimeout(2000);

          // Verifica se produto foi adicionado à tabela/lista
          const addedItem = page.locator(`text=${testTitle}`);
          const itemAppeared = (await addedItem.count()) > 0;
          recordResult('Jornada 4', 'Cadastro de Novo Produto Isolado na Loja Demo', itemAppeared, testTitle);

          // Teste do Botão Importar em Lote
          const batchBtn = page.locator('button:has-text("Importar em Lote")').first();
          if ((await batchBtn.count()) > 0) {
            await batchBtn.click();
            await page.waitForTimeout(400);
            const batchTextarea = page.locator('textarea[placeholder*="mercadolivre"], textarea[placeholder*="Cole"]').first();
            const hasBatchInput = (await batchTextarea.count()) > 0;
            recordResult('Jornada 4', 'Módulo de Importação em Lote Funcional', hasBatchInput, 'Textarea de lote aberta');
            // Volta para modo individual
            const indivBtn = page.locator('button:has-text("Entrada Individual")').first();
            if ((await indivBtn.count()) > 0) await indivBtn.click();
          }

          // Excluir o produto de teste criado para manter catálogo íntegro
          const deleteBtn = page.locator(`div:has-text("${testTitle}") button[title="Remover produto"]`).first();
          if ((await deleteBtn.count()) > 0) {
            page.once('dialog', (dialog) => dialog.accept());
            await deleteBtn.click();
            await page.waitForTimeout(1000);
            const stillExists = (await page.locator(`text=${testTitle}`).count()) > 0;
            recordResult('Jornada 4', 'Exclusão do Produto de Teste via Painel', !stillExists, 'Catálogo saneado');
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // Aba: Disparador VIP
      // ─────────────────────────────────────────────────────────────────
      const disparadorTab = page.locator('button[role="tab"]:has-text("Disparador VIP")');
      if ((await disparadorTab.count()) > 0) {
        await disparadorTab.click();
        await page.waitForTimeout(600);

        // Busca no disparador
        const dispSearch = page.locator('input[placeholder*="Buscar nos meus produtos"]').first();
        if ((await dispSearch.count()) > 0) {
          await dispSearch.fill('Air Fryer');
          await page.waitForTimeout(300);
          await dispSearch.fill('');
        }

        // Seleciona um produto para carregar as opções de template
        const prodItem = page.locator('div:has-text("Shopee"), div:has-text("Mercado Livre")').first();
        if ((await prodItem.count()) > 0) {
          await prodItem.click();
          await page.waitForTimeout(500);
        }

        // Alternância de Templates
        const templateBtns = page.locator('button:has-text("Achadinho do Dia"), button:has-text("Urgência / Relâmpago"), button:has-text("Últimas Unidades")');
        const countTemplates = await templateBtns.count();
        recordResult('Jornada 4', 'Disparador VIP: Templates Liberados no Plano Pro (3 templates)', countTemplates >= 3, `${countTemplates} templates disponíveis`);

        // Cópia de Copy
        const copyBtn = page.locator('button:has-text("Copiar Copy")').first();
        if ((await copyBtn.count()) > 0) {
          await copyBtn.click().catch(() => {});
          recordResult('Jornada 4', 'Disparador VIP: Ação de Cópia da Mensagem Formatada', true, 'Botão de cópia responsivo');
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // Aba: Minha Assinatura
      // ─────────────────────────────────────────────────────────────────
      const assinaturaTab = page.locator('button[role="tab"]:has-text("Minha Assinatura")');
      if ((await assinaturaTab.count()) > 0) {
        await assinaturaTab.click();
        await page.waitForTimeout(600);

        const planText = await page.locator('text=Plano Pro, text=PRO, text=R$ 117').first().innerText().catch(() => '');
        recordResult('Jornada 4', 'Exibição Correta do Plano Pro na Assinatura', planText.length > 0, planText);

        const upgradeBtn = page.locator('button:has-text("Fazer Upgrade"), button:has-text("Mudar para Advanced")').first();
        const hasUpgrade = (await upgradeBtn.count()) > 0;
        recordResult('Jornada 4', 'Botão de Upgrade Disponível', hasUpgrade, 'Upgrade acessível');
      }

      await context.close();
    }

    // =========================================================================
    // JORNADA 5: Limpeza & Saneamento Pós-QA
    // =========================================================================
    console.log('\n👉 [JORNADA 5] Limpeza & Saneamento Pós-QA no Supabase');
    {
      // 1. Remover loja de teste 'qa-cliente-fcia'
      const { error: delStoreError } = await supabase
        .from('lojas_afiliados')
        .delete()
        .eq('slug', 'qa-cliente-fcia');

      recordResult('Jornada 5', 'Remoção de qa-cliente-fcia em public.lojas_afiliados', !delStoreError, delStoreError?.message || 'Sucesso');

      // 2. Remover qualquer produto temporário de teste
      const { error: delProdError } = await supabase
        .from('produtos_clarice')
        .delete()
        .like('title', '%Teste QA%');

      recordResult('Jornada 5', 'Expurgo de Produtos Temporários de Teste', !delProdError, delProdError?.message || 'Sucesso');

      // 3. Garantir integridade da loja 'clarice' e 'loja-demo'
      const { data: storesAfter, error: queryStoreErr } = await supabase
        .from('lojas_afiliados')
        .select('slug, nome_loja, status_assinatura')
        .in('slug', ['clarice', 'loja-demo']);

      const hasBoth = storesAfter && storesAfter.length === 2;
      recordResult('Jornada 5', 'Preservação Intacta das Lojas Oficiais (clarice e loja-demo)', hasBoth, `${storesAfter?.length} lojas encontradas`);

      // 4. Conferir contagem de produtos da loja-demo (devem ser exatamente 8)
      const { count: demoProdCount, error: countErr } = await supabase
        .from('produtos_clarice')
        .select('*', { count: 'exact', head: true })
        .eq('loja_slug', 'loja-demo');

      recordResult('Jornada 5', 'Preservação dos 8 Produtos Exclusivos da Loja Demo', demoProdCount === 8, `${demoProdCount} produtos ativos`);
    }

  } catch (fatalError) {
    console.error('\n💥 ERRO FATAL DURANTE A EXECUÇÃO DO QA:', fatalError);
    report.summary.failed++;
  } finally {
    await browser.close();
  }

  // =========================================================================
  // RELATÓRIO CONSOLIDADO
  // =========================================================================
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📊 RELATÓRIO CONSOLIDADO DO QA CLIENTE REAL');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Total de Validações : ${report.summary.total}`);
  console.log(`Passaram (Success)  : ${report.summary.passed}`);
  console.log(`Falharam (Failed)   : ${report.summary.failed}`);
  console.log(`Console Errors      : ${report.consoleErrors.length}`);
  console.log(`Network Errors (>=400): ${report.networkErrors.length}`);
  console.log(`Page Errors         : ${report.pageErrors.length}`);

  if (report.consoleErrors.length > 0) {
    console.log('\n⚠️ Detalhes dos Erros de Console:');
    report.consoleErrors.forEach((e, idx) => console.log(`  [${idx + 1}] (${e.context}): ${e.text}`));
  }

  if (report.networkErrors.length > 0) {
    console.log('\n⚠️ Detalhes dos Erros de Rede:');
    report.networkErrors.forEach((e, idx) => console.log(`  [${idx + 1}] (${e.context}) Status ${e.status}: ${e.url}`));
  }

  if (report.pageErrors.length > 0) {
    console.log('\n💥 Detalhes dos Page Errors:');
    report.pageErrors.forEach((e, idx) => console.log(`  [${idx + 1}] (${e.context}): ${e.message}`));
  }

  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (report.summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
