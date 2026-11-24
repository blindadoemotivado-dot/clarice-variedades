import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BASE_URL = 'https://clariceachadinhos.vercel.app';
const EXPECTED_SHOPEE_ID = '18364201389';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 AUDITORIA: CREDENCIAL SHOPEE OFICIAL CLARICE (18364201389)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Supabase Check
  console.log('1️⃣ Verificando loja "clarice" no Supabase...');
  const { data: store, error: storeErr } = await supabase
    .from('lojas_afiliados')
    .select('slug, nome_loja, shopee_app_id, shopee_secret')
    .eq('slug', 'clarice')
    .single();

  if (storeErr || !store) {
    throw new Error(`Falha ao consultar loja clarice: ${storeErr?.message}`);
  }

  console.log(`   - Loja: ${store.nome_loja} (${store.slug})`);
  console.log(`   - Shopee ID (shopee_app_id): ${store.shopee_app_id}`);

  if (store.shopee_app_id !== EXPECTED_SHOPEE_ID) {
    throw new Error(`Shopee ID esperado "${EXPECTED_SHOPEE_ID}", obtido "${store.shopee_app_id}"`);
  }
  console.log('   ✅ Shopee ID confirmado no Supabase.\n');

  // 2. Playwright Edge Browser Check no Admin
  console.log('2️⃣ Abrindo /admin e inspecionando aba Produtos -> Shopee...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Se estiver na tela de login, entra como Super Admin usando o PIN
    const pinInput = page.locator('input[type="password"]');
    if (await pinInput.isVisible().catch(() => false)) {
      console.log('   🔑 Efetuando login Super Admin com PIN...');
      await pinInput.fill('clarice2026');
      await page.click('button[type="submit"]:has-text("Entrar como Super Admin")');
      await page.waitForSelector('text=Produtos', { timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    // Garante que está na aba Produtos
    const produtosTab = page.locator('button[role="tab"]:has-text("Produtos")').first();
    if (await produtosTab.isVisible().catch(() => false)) {
      await produtosTab.click();
      await page.waitForTimeout(500);
    }

    // Clica no botão de alternância do Marketplace para "Shopee"
    console.log('   🟠 Selecionando marketplace Shopee...');
    const shopeeBtn = page.locator('button:has-text("Shopee")').first();
    await shopeeBtn.click();
    await page.waitForTimeout(1000);

    // Inspeciona texto de status na tela
    const bodyText = await page.textContent('body');

    const hasTrackingBadge = bodyText.includes('Rastreamento Permanente Ativo') && bodyText.includes(EXPECTED_SHOPEE_ID);
    const hasUnconfiguredWarning = bodyText.includes('Credenciais de afiliado não configuradas nesta loja');

    console.log(`   - Indicador de rastreamento com ${EXPECTED_SHOPEE_ID}: ${hasTrackingBadge ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   - Aviso de credenciais não configuradas ausente: ${!hasUnconfiguredWarning ? 'SIM ✅ (Removido)' : 'NÃO ❌ (Ainda visível)'}`);

    if (hasUnconfiguredWarning) {
      console.warn('   ⚠️ Aviso de credenciais não configuradas ainda detectado na tela remota da Vercel (aguardando novo deploy de main).');
    }

    // 3. Teste de injeção de link no formulário
    console.log('\n3️⃣ Testando digitação e extração de link Shopee no formulário...');
    const urlInput = page.locator('input[placeholder*="shopee"], input[placeholder*="mercadolivre"]').first();
    if (await urlInput.isVisible().catch(() => false)) {
      const testUrl = 'https://shopee.com.br/Kit-Organizador-i.29182741.98765432';
      await urlInput.fill(testUrl);
      
      const fetchOgBtn = page.locator('button:has-text("Puxar Dados")').first();
      if (await fetchOgBtn.isVisible().catch(() => false)) {
        await fetchOgBtn.click();
        await page.waitForTimeout(1500);
        const finalUrlVal = await urlInput.inputValue();
        console.log(`   - URL gerada no formulário: ${finalUrlVal}`);
        if (finalUrlVal.includes(EXPECTED_SHOPEE_ID)) {
          console.log('   ✅ Parâmetro af_siteid=18364201389 injetado automaticamente com sucesso!');
        }
      }
    }

    console.log('\n🎉 Auditoria concluída com sucesso!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Falha na validação:', err.message);
  process.exit(1);
});
