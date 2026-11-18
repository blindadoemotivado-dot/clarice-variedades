import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { runRadarCrawler } from './radar-ofertas.mjs';

// 1. Carrega variáveis de ambiente
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
const AFFILIATE_TAG =
  process.env.ML_AFFILIATE_TAG || 'kd20250113073553';
const AFFILIATE_SUBTAG = 'clariceachadinhos';
const LINKBUILDER_URL = 'https://www.mercadolivre.com.br/afiliados/linkbuilder';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

/**
 * Garante que a etiqueta oficial (ex: 'clariceachadinhos') esteja selecionada ou preenchida no Link Builder
 */
async function ensureEtiquetaSelected(page, etiquetaName = AFFILIATE_SUBTAG) {
  console.log(`🏷️ Verificando e garantindo etiqueta oficial "${etiquetaName}"...`);
  try {
    // 1. Procurar dropdown ou select existente
    const dropdownTrigger = page.locator(
      'button:has-text("Etiqueta"), [aria-label*="etiqueta" i], .andes-dropdown__trigger, [role="combobox"]'
    ).first();

    if ((await dropdownTrigger.count()) > 0 && (await dropdownTrigger.isVisible())) {
      const text = await dropdownTrigger.innerText().catch(() => '');
      if (text.toLowerCase().includes(etiquetaName.toLowerCase())) {
        console.log(`✓ Etiqueta "${etiquetaName}" já está ativa no seletor.`);
        return;
      }
      await dropdownTrigger.click().catch(() => {});
      await page.waitForTimeout(600);

      const option = page.locator(
        `[role="option"]:has-text("${etiquetaName}"), li:has-text("${etiquetaName}"), button:has-text("${etiquetaName}")`
      ).first();

      if ((await option.count()) > 0 && (await option.isVisible())) {
        await option.click().catch(() => {});
        console.log(`✓ Etiqueta "${etiquetaName}" selecionada no menu.`);
        await page.waitForTimeout(500);
        return;
      }
    }

    // 2. Procurar campo de texto de etiqueta/tag
    const tagInputSelectors = [
      'input[placeholder*="etiqueta" i]',
      'input[placeholder*="tag" i]',
      'input[name*="tag" i]',
      'input[name*="subid" i]',
      'input[name*="label" i]',
      '[data-testid*="etiqueta" i]',
      '[data-testid*="tag" i]',
    ];

    for (const sel of tagInputSelectors) {
      const el = page.locator(sel).first();
      if ((await el.count()) > 0 && (await el.isVisible())) {
        const val = await el.inputValue().catch(() => '');
        if (!val || !val.toLowerCase().includes(etiquetaName.toLowerCase())) {
          await el.fill(etiquetaName);
          await page.keyboard.press('Enter').catch(() => {});
          console.log(`✓ Etiqueta "${etiquetaName}" preenchida no formulário.`);
          await page.waitForTimeout(500);
        } else {
          console.log(`✓ Etiqueta "${etiquetaName}" já confirmada no campo.`);
        }
        return;
      }
    }

    // 3. Procurar radio, botão ou chip de etiqueta
    const chip = page.locator(`button:has-text("${etiquetaName}"), label:has-text("${etiquetaName}")`).first();
    if ((await chip.count()) > 0 && (await chip.isVisible())) {
      await chip.click().catch(() => {});
      console.log(`✓ Chip da etiqueta "${etiquetaName}" selecionado.`);
    }
  } catch (err) {
    console.warn(`ℹ️ Detalhe ao verificar etiqueta "${etiquetaName}":`, err.message);
  }
}

/**
 * Converte um lote de até 10 produtos no Gerador de Produtos Recomendados do Mercado Livre
 */
async function convertBatchInLinkBuilder(page, batchUrls, batchNum, totalBatches) {
  console.log(`\n=============================================================`);
  console.log(`🔗 [Lote ${batchNum}/${totalBatches}] Gerador de Produtos Recomendados`);
  console.log(`📋 Total de produtos neste lote: ${batchUrls.length} (limite de 10)`);
  console.log(`=============================================================`);

  await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Tratar autenticação sem timeout caso caia em login
  const currentUrl = page.url();
  const needsLogin =
    currentUrl.includes('login') ||
    currentUrl.includes('identification') ||
    currentUrl.includes('auth') ||
    !currentUrl.includes('/afiliados/');

  if (needsLogin) {
    console.log('\n=============================================================');
    console.log(`🔑 LOGIN NO MERCADO LIVRE AFILIADOS (${AFFILIATE_TAG})`);
    console.log('=============================================================');
    console.log('👉 Por favor, conclua o login na sua conta de Afiliado na janela do Microsoft Edge.');
    console.log('👉 Sua sessão ficará salva permanentemente em .edge-ml-profile.');
    console.log('👉 SEM TIMEOUT: Conclua com calma (login, senha, 2FA, SMS, etc.).');
    console.log('👉 Quando estiver na página do Gerador de Links (/afiliados/linkbuilder), pressione [ENTER] aqui no terminal...');

    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    await askQuestion('> ');

    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(35000);

    if (!page.url().includes('/afiliados/linkbuilder')) {
      console.log('🔄 Redirecionando para o Gerador de Links...');
      await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
  }

  // Garantir a etiqueta 'clariceachadinhos' selecionada
  await ensureEtiquetaSelected(page, AFFILIATE_SUBTAG);

  // Inserir os links reais dos produtos (até 10 por vez)
  console.log(`📝 Inserindo ${batchUrls.length} link(s) de anúncios no formulário...`);
  const batchText = batchUrls.join('\n');

  const selectors = [
    'textarea',
    'input[type="text"][placeholder*="http" i]',
    'input[placeholder*="http" i]',
    'input[placeholder*="link" i]',
    'input[placeholder*="anúncio" i]',
    'input[placeholder*="anuncio" i]',
    'input[placeholder*="produto" i]',
    '[data-testid*="link"]',
    '[name*="link"]',
    'input[type="text"]',
  ];

  let inputField = null;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0 && (await el.isVisible())) {
      inputField = el;
      break;
    }
  }

  if (inputField) {
    try {
      await inputField.fill('');
      await inputField.fill(batchText);
      console.log('✓ Links colados no formulário com sucesso!');
      await page.waitForTimeout(1000);

      // Clicar no botão de gerar links
      const btnSelectors = [
        'button:has-text("Gerar link")',
        'button:has-text("Gerar")',
        'button:has-text("Criar link")',
        'button:has-text("Criar")',
        'button[type="submit"]',
      ];

      for (const bSel of btnSelectors) {
        const btn = page.locator(bSel).first();
        if ((await btn.count()) > 0 && (await btn.isVisible())) {
          await btn.click();
          console.log('✓ Botão de gerar links acionado.');
          break;
        }
      }
    } catch (err) {
      console.warn('⚠️ Aviso ao interagir com campos do formulário:', err.message);
    }
  }

  console.log('⏳ Aguardando links curtos oficiais na página...');
  await page.waitForTimeout(4000);

  // Extrair links curtos gerados
  let extracted = await page.evaluate(() => {
    const regex = /(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/g;
    const text = document.body.innerText || '';
    const matches = text.match(regex) || [];

    const hrefs = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && (h.includes('meli.la') || h.includes('mercadolivre.com/sec')));

    const inputs = Array.from(document.querySelectorAll('input, textarea'))
      .map((i) => i.value)
      .filter((v) => v && (v.includes('meli.la') || v.includes('mercadolivre.com/sec')));

    return Array.from(new Set([...matches, ...hrefs, ...inputs]));
  });

  // Se não extraiu automaticamente, dar oportunidade de confirmar ou colar no terminal
  if (extracted.length === 0) {
    console.log('\n💡 Clique em "Gerar" na janela do Edge caso ainda não tenha sido gerado.');
    await askQuestion('Pressione [ENTER] quando os links curtos (meli.la / mercadolivre.com/sec) estiverem na tela...');

    extracted = await page.evaluate(() => {
      const regex = /(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/g;
      const text = document.body.innerText || '';
      const matches = text.match(regex) || [];
      const hrefs = Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && (h.includes('meli.la') || h.includes('mercadolivre.com/sec')));
      return Array.from(new Set([...matches, ...hrefs]));
    });

    if (extracted.length === 0) {
      console.log('👉 Se você copiou os links curtos do Mercado Livre, cole-os aqui abaixo (separados por espaço ou quebra de linha):');
      const pasted = await askQuestion('> ');
      if (pasted.trim()) {
        extracted = pasted
          .split(/[\s\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.includes('mercadolivre.com') || s.includes('meli.la'));
      }
    }
  }

  console.log(`✓ Lote ${batchNum}: ${extracted.length} link(s) curto(s) obtido(s).`);
  return extracted;
}

/**
 * Converte toda a fila em lotes de até 10 produtos
 */
async function convertLinksInBatches(page, productUrls) {
  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < productUrls.length; i += BATCH_SIZE) {
    batches.push(productUrls.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n🎯 Fila dividida em ${batches.length} lote(s) de até 10 produtos para o formulário oficial.`);

  const allShortLinks = [];
  for (let i = 0; i < batches.length; i++) {
    const links = await convertBatchInLinkBuilder(page, batches[i], i + 1, batches.length);
    allShortLinks.push(...links);
  }

  return allShortLinks;
}

async function main() {
  console.log('\n=============================================================');
  console.log('🚀 [Clarice Achadinhos] Automação Completa via Microsoft Edge');
  console.log(`🏷️ Conta Afiliado: ${AFFILIATE_TAG}`);
  console.log(`🔖 Etiqueta: ${AFFILIATE_SUBTAG}`);
  console.log('=============================================================\n');

  const USER_DATA_DIR = path.resolve(process.cwd(), '.edge-ml-profile');

  // Limpeza cirúrgica: encerra EXCLUSIVAMENTE processos órfãos vinculados à pasta .edge-ml-profile
  // O navegador Edge pessoal e as janelas do usuário NUNCA são fechados
  try {
    if (process.platform === 'win32') {
      execSync(
        'powershell -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'msedge.exe\'\\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like \'*edge-ml-profile*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
        { stdio: 'ignore' }
      );
    }
  } catch (_) {}

  // Limpeza de travas residuais exclusivas da pasta .edge-ml-profile
  try {
    if (fs.existsSync(USER_DATA_DIR)) {
      const files = fs.readdirSync(USER_DATA_DIR);
      for (const f of files) {
        if (f.startsWith('Singleton') || f === 'lockfile') {
          try {
            fs.unlinkSync(path.join(USER_DATA_DIR, f));
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  // Inicializar Edge com perfil persistente UMA ÚNICA VEZ
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const page = context.pages()[0] || (await context.newPage());

    // --------------------------------------------------------------------------
    // ROTINA 1: Configuração do Link Geral de Afiliado (Botão Amarelo)
    // --------------------------------------------------------------------------
    console.log('🔍 [ROTINA 1/3] Configurando Link Geral de Afiliado (Botão Amarelo)...');
    const { data: storeSettingsRow } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const currentGeneral = storeSettingsRow?.general_affiliate_url || '';
    const hasShortGeneral =
      currentGeneral.includes('mercadolivre.com/sec/') ||
      currentGeneral.includes('meli.la/');

    // Buscar se já existe um link curto oficial do primeiro produto ativo na vitrine
    const { data: firstActiveProduct } = await supabase
      .from('produtos_clarice')
      .select('affiliate_url')
      .eq('active', true)
      .or('affiliate_url.ilike.%mercadolivre.com/sec/%,affiliate_url.ilike.%meli.la/%')
      .limit(1)
      .maybeSingle();

    const officialOffersWithTag = `https://www.mercadolivre.com.br/ofertas#matt_tool=${AFFILIATE_TAG}&matt_word=${AFFILIATE_SUBTAG}`;

    const targetGeneralUrl = hasShortGeneral
      ? currentGeneral
      : firstActiveProduct?.affiliate_url || officialOffersWithTag;

    if (currentGeneral !== targetGeneralUrl) {
      await supabase
        .from('store_settings')
        .upsert({
          id: 'default',
          general_affiliate_url: targetGeneralUrl,
          updated_at: new Date().toISOString(),
        });
      console.log(`🎉 Link Geral do Botão Amarelo configurado no Supabase: ${targetGeneralUrl}`);
    } else {
      console.log(`✅ Link Geral de Afiliado já atualizado: ${targetGeneralUrl}`);
    }

    // --------------------------------------------------------------------------
    // ROTINA 2: Garimpo Misto no Edge (Infantil & Bebês + Achadinhos Gerais)
    // --------------------------------------------------------------------------
    console.log('\n📡 [ROTINA 2/3] Executando garimpo misto de ofertas reais no Mercado Livre...');
    try {
      await runRadarCrawler({
        minDiscount: 15,
        tag: AFFILIATE_TAG,
        targetCount: 36,
        existingPage: page,
      });
    } catch (err) {
      console.warn('⚠️ Aviso no garimpo:', err.message);
    }

    // --------------------------------------------------------------------------
    // ROTINA 3: Monetização em Lote de Itens Pendentes no Link Builder (10 por lote)
    // --------------------------------------------------------------------------
    console.log('\n📋 [ROTINA 3/3] Buscando achadinhos pendentes de monetização no Supabase...');
    const { data: pending, error: fetchErr } = await supabase
      .from('produtos_clarice')
      .select('id, mlb_id, title, category, discount_percent, affiliate_url')
      .eq('status', 'pendente_afiliado')
      .order('created_at', { ascending: false });

    if (fetchErr) {
      console.error('❌ Erro ao buscar produtos pendentes:', fetchErr.message);
      return;
    }

    if (!pending || pending.length === 0) {
      console.log('✅ Nenhum produto pendente no Radar. Todos os achadinhos estão ativos e monetizados!');
      return;
    }

    console.log(`🎯 Encontradas ${pending.length} oferta(s) na fila do Radar aguardando link oficial.`);

    const productUrls = pending.map((p) => `https://produto.mercadolivre.com.br/${p.mlb_id}`);

    const shortLinks = await convertLinksInBatches(page, productUrls);
    console.log(`\n🔎 Total de links curtos obtidos: ${shortLinks.length} para ${pending.length} produto(s).`);

    console.log(`💾 Atualizando produtos no Supabase com etiqueta "${AFFILIATE_SUBTAG}" para status "ativo"...`);
    let updatedCount = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const finalAffiliateUrl = shortLinks[i] || item.affiliate_url;

      const { error: updErr } = await supabase
        .from('produtos_clarice')
        .update({
          affiliate_url: finalAffiliateUrl,
          active: true,
          status: 'ativo',
        })
        .eq('id', item.id);

      if (!updErr) {
        updatedCount++;
      } else {
        console.warn(`Erro ao atualizar item ${item.mlb_id}:`, updErr.message);
      }
    }

    // Se o botão amarelo ainda usava URL com hashtag e temos novos links curtos, promove o 1º link
    if (shortLinks[0] && !hasShortGeneral) {
      await supabase
        .from('store_settings')
        .update({
          general_affiliate_url: shortLinks[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'default');
      console.log(`🔗 Link Geral do Botão Amarelo promovido para o 1º link curto: ${shortLinks[0]}`);
    }

    console.log(`\n🎉 SUCESSO: ${updatedCount} achadinhos aprovados, monetizados e publicados na vitrine!`);
    console.log('👉 Acesse a vitrine oficial: https://clarice-variedades.vercel.app\n');
  } finally {
    console.log('🔒 Encerrando sessão do Microsoft Edge com segurança...');
    await context.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('❌ Erro fatal no robô autônomo:', err);
  process.exit(1);
});
