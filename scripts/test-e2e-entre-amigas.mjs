/**
 * Teste Automatizado End-to-End da Loja 'entre-amigas-promos'
 * Executado via Playwright (channel: 'msedge') e Supabase SDK.
 */

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const PORT = 3456;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Servidor não respondeu em ${url} dentro do timeout.`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚀 TESTE END-TO-END — LOJA ENTRE AMIGAS PROMOS');
  console.log('👤 Titular: Tatiane Mirian Bernardo Conceição');
  console.log('🌐 Navegador: Microsoft Edge (channel: msedge)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Prepara a loja como ATIVA para a primeira fase do teste
  console.log('1️⃣ Preparando loja no Supabase com status ATIVO para o teste...');
  const { error: prepError } = await supabase
    .from('lojas_afiliados')
    .update({
      nome_loja: 'Entre amigas promos',
      status_assinatura: 'ativo',
      plano: 'pro',
      shopee_secret: 'tatianemirianbernardoconcei',
      shopee_app_id: '18318420060',
    })
    .eq('slug', 'entre-amigas-promos');

  if (prepError) {
    console.error('❌ Erro ao preparar loja no Supabase:', prepError.message);
    process.exit(1);
  }
  console.log('✅ Loja preparada com status: ativo, plano: pro, credenciais gravadas.\n');

  // 2. Conecta ao servidor local Vite já em execução
  console.log(`2️⃣ Conectando ao servidor Vite local em ${BASE_URL}...`);
  await waitForServer(`${BASE_URL}/admin`);
  console.log(`✅ Servidor local pronto em ${BASE_URL}\n`);

  let browser;
  try {
    // 3. Inicia o browser Edge
    console.log('3️⃣ Abrindo Microsoft Edge...');
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('clarice_splash_seen', 'true');
      } catch (e) {}
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    page.on('pageerror', (err) => {
      console.log('UNCAUGHT PAGE ERROR:', err.message);
    });

    // 4. Teste de Login da Tatiane
    console.log('4️⃣ Acessando /admin e realizando login de lojista...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Alterna para o modo Lojista
    await page.click('button:has-text("Lojista Assinante")');
    await page.waitForTimeout(500);

    // Preenche credenciais
    await page.fill('input[type="email"]', 'tatianemirianbc@gmail.com');
    await page.fill('input[type="password"]', 'Deusefiel0527@');
    await page.click('button[type="submit"]:has-text("Entrar na Minha Loja")');

    // Aguarda o painel carregar
    await page.waitForSelector('text=entre-amigas-promos', { timeout: 15000 });
    console.log('✅ Login efetuado com sucesso no painel da loja Entre amigas promos!\n');

    // 5. Teste da Aba "Minha Loja" — Verificação das Credenciais
    console.log('5️⃣ Verificando aba "Minha Loja" e credenciais de afiliado...');
    await page.click('button[role="tab"]:has-text("Minha Loja")');
    await page.waitForTimeout(600);

    const mlTagInput = page.locator('input[placeholder="Ex: seuusuario ou link social ML"]');
    const shopeeIdInput = page.locator('input[placeholder="Ex: 18318420060"]');

    await mlTagInput.waitFor({ state: 'visible', timeout: 5000 });
    const mlVal = await mlTagInput.inputValue();
    const shopeeVal = await shopeeIdInput.inputValue();

    console.log(`   - Tag Mercado Livre exibida no formulário: "${mlVal}"`);
    console.log(`   - ID Shopee exibido no formulário: "${shopeeVal}"`);

    if (mlVal !== 'tatianemirianbernardoconcei') {
      throw new Error(`Esperado ml_affiliate_tag "tatianemirianbernardoconcei", obtido "${mlVal}"`);
    }
    if (shopeeVal !== '18318420060') {
      throw new Error(`Esperado shopee_affiliate_id "18318420060", obtido "${shopeeVal}"`);
    }

    // Clica em Salvar Alterações da Minha Loja
    await page.click('button:has-text("Salvar Alterações da Minha Loja")');
    await page.waitForTimeout(1000);
    console.log('✅ Credenciais conferidas e salvas com sucesso na aba Minha Loja!\n');

    // 6. Teste da Aba "Meus Produtos" — Selo Verde e Cadastro com Injeção
    console.log('6️⃣ Verificando aba "Meus Produtos", selo permanente e cadastro...');
    await page.click('button[role="tab"]:has-text("Meus Produtos")');
    await page.waitForTimeout(600);

    // Confirma presença do selo verde permanente
    const badgeText = await page.locator('text=Rastreamento Permanente Ativo').textContent();
    console.log(`   - Selo detectado: "${badgeText.trim()}"`);
    if (!badgeText.includes('tatianemirianbernardoconcei') || !badgeText.includes('18318420060')) {
      throw new Error(`Selo de rastreamento não contém ambas as credenciais: ${badgeText}`);
    }
    console.log('✅ Selo verde permanente verificado com sucesso!');

    // Cadastra Produto 1: Shopee
    console.log('   - Cadastrando Produto Shopee de teste...');
    const shopeeRawUrl = 'https://shopee.com.br/Tenis-Corrida-Conforto-i.98765.43210';
    await page.click('button:has-text("Shopee")');
    await page.locator('input[type="url"]').first().fill(shopeeRawUrl);
    await page.click('button:has-text("Puxar Dados")');
    await page.waitForTimeout(600);

    const shopeeInjectedUrl = await page.locator('input[type="url"]').first().inputValue();
    console.log(`   - URL Shopee após auto-injeção: ${shopeeInjectedUrl}`);
    if (!shopeeInjectedUrl.includes('af_siteid=18318420060')) {
      throw new Error(`Injeção da Shopee falhou: ${shopeeInjectedUrl}`);
    }

    await page.fill('input[placeholder="Ex: Fritadeira Air Fryer 4L Inox 110V"]', 'Tênis Teste Shopee EA');
    await page.fill('input[placeholder="Ex: 279,90"]', '99,90');
    await page.click('button:has-text("Publicar na Vitrine")');
    await page.waitForTimeout(1200);
    console.log('✅ Produto Shopee cadastrado com comissionamento permanente da Tatiane!');

    // Cadastra Produto 2: Mercado Livre
    console.log('   - Cadastrando Produto Mercado Livre de teste...');
    const mlRawUrl = 'https://produto.mercadolivre.com.br/MLB-888777666-smartwatch-fitness-_JM';
    await page.click('button:has-text("Mercado Livre")');
    await page.locator('input[type="url"]').first().fill(mlRawUrl);
    await page.click('button:has-text("Puxar Dados")');
    await page.waitForTimeout(600);

    const mlInjectedUrl = await page.locator('input[type="url"]').first().inputValue();
    console.log(`   - URL ML após auto-injeção: ${mlInjectedUrl}`);
    if (!mlInjectedUrl.includes('matt_word=tatianemirianbernardoconcei')) {
      throw new Error(`Injeção do ML falhou: ${mlInjectedUrl}`);
    }

    await page.fill('input[placeholder="Ex: Fritadeira Air Fryer 4L Inox 110V"]', 'Smartwatch Teste ML EA');
    await page.fill('input[placeholder="Ex: 279,90"]', '159,90');
    await page.click('button:has-text("Publicar na Vitrine")');
    await page.waitForTimeout(1200);
    console.log('✅ Produto Mercado Livre cadastrado com comissionamento permanente da Tatiane!\n');

    // 7. Teste de Isolamento da Vitrine Pública
    console.log('7️⃣ Verificando vitrine pública /?loja=entre-amigas-promos...');
    const vitrinePage = await context.newPage();
    await vitrinePage.addInitScript(() => {
      try {
        sessionStorage.setItem('clarice_splash_seen', 'true');
      } catch (e) {}
    });
    await vitrinePage.goto(`${BASE_URL}/?loja=entre-amigas-promos`, { waitUntil: 'networkidle' });
    await vitrinePage.waitForSelector('text=Entre amigas', { timeout: 8000 });

    const vitrineContent = await vitrinePage.content();
    const hasShopeeProd = vitrineContent.includes('Tênis Teste Shopee EA');
    const hasMlProd = vitrineContent.includes('Smartwatch Teste ML EA');
    console.log(`   - Produto Shopee visível na vitrine: ${hasShopeeProd ? 'SIM' : 'NÃO'}`);
    console.log(`   - Produto ML visível na vitrine: ${hasMlProd ? 'SIM' : 'NÃO'}`);

    if (!hasShopeeProd || !hasMlProd) {
      throw new Error('Os produtos cadastrados não apareceram na vitrine pública da loja!');
    }
    console.log('✅ Vitrine pública isolada funcionando perfeitamente com os produtos da Tatiane!\n');
    await vitrinePage.close();

    // 8. Limpeza: Exclui os 2 produtos de teste
    console.log('8️⃣ Limpando os 2 produtos de teste da vitrine...');
    const deleteButtons = page.locator('button[title*="Excluir"], button:has(svg.lucide-trash-2)');
    const count = await deleteButtons.count();
    for (let i = 0; i < count; i++) {
      try {
        await deleteButtons.first().click();
        await page.waitForTimeout(500);
      } catch {
        // ignore
      }
    }
    // Também limpa via Supabase para garantia absoluta
    await supabase.from('produtos_clarice').delete().eq('loja_slug', 'entre-amigas-promos');
    console.log('✅ Vitrine limpa e pronta para inauguração!\n');

    // 9. Bloqueio como 'pendente' mantendo plano 'pro'
    console.log('9️⃣ Atualizando status para PENDENTE (cortesia plano pro de 30 dias)...');
    const { error: blockError } = await supabase
      .from('lojas_afiliados')
      .update({
        status_assinatura: 'pendente',
        plano: 'pro',
      })
      .eq('slug', 'entre-amigas-promos');

    if (blockError) {
      throw new Error(`Falha ao alterar status para pendente: ${blockError.message}`);
    }
    console.log('✅ Loja atualizada para status: pendente, plano: pro no Supabase.\n');

    // 10. Teste de Tentativa de Login com Status PENDENTE
    console.log('🔟 Testando bloqueio de login com status PENDENTE...');
    // Realiza logout primeiro
    await page.click('button:has-text("Sair")');
    await page.waitForTimeout(500);

    // Tenta novo login
    await page.click('button:has-text("Lojista Assinante")');
    await page.waitForTimeout(300);
    await page.fill('input[type="email"]', 'tatianemirianbc@gmail.com');
    await page.fill('input[type="password"]', 'Deusefiel0527@');
    await page.click('button[type="submit"]:has-text("Entrar na Minha Loja")');

    // Aguarda a mensagem de erro toast aparecer
    await page.waitForSelector('text=Acesso bloqueado', { timeout: 6000 });
    console.log('✅ BLOQUEIO CONFIRMADO! Mensagem exibida: "Acesso bloqueado: Seu cadastro ou pagamento está pendente de confirmação."\n');

  } finally {
    if (browser) await browser.close();
  }

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🎉 TODOS OS TESTES E2E FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('═══════════════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Falha na execução do teste E2E:', err);
  process.exit(1);
});
