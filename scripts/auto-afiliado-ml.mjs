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
 * Normaliza qualquer URL ou código MLB para o formato limpo de anúncio:
 * https://produto.mercadolivre.com.br/MLB-XXXXX (sem query strings ou parâmetros)
 */
export function normalizeProductUrl(urlOrMlb) {
  if (!urlOrMlb) return '';
  const str = String(urlOrMlb).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str.split('?')[0].split('#')[0];
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length <= 8) {
    return `https://www.mercadolivre.com.br/p/MLB${digits}`;
  }
  return `https://produto.mercadolivre.com.br/MLB-${digits}`;
}

/**
 * Converte 1 produto de forma 1-para-1 no Link Builder oficial do Mercado Livre
 * Elimina completamente deslocamento de índice ou pareamento trocado
 */
async function convertSingleProductInLinkBuilder(page, item, index, total) {
  const cleanUrl = normalizeProductUrl(item.affiliate_url || item.mlb_id);
  console.log(`\n🔗 [${index}/${total}] Convertendo produto: "${item.title.slice(0, 36)}..."`);
  console.log(`   URL Real de Origem: ${cleanUrl}`);

  if (!cleanUrl || !cleanUrl.includes('mercadolivre.com.br')) {
    console.warn(`   ⚠️ URL inválida para conversão: ${cleanUrl}`);
    return null;
  }

  // Garante que está na página do Link Builder
  if (!page.url().includes('/afiliados/linkbuilder')) {
    await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }

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
    console.log('👉 Quando estiver na página do Gerador de Links (/afiliados/linkbuilder), pressione [ENTER] aqui...');

    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);
    await askQuestion('> ');
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(35000);

    if (!page.url().includes('/afiliados/linkbuilder')) {
      await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
  }

  // Garantir a etiqueta 'clariceachadinhos' selecionada
  await ensureEtiquetaSelected(page, AFFILIATE_SUBTAG);

  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if ((await textarea.count()) === 0) {
    console.warn('   ⚠️ Textarea do Link Builder não encontrado.');
    return null;
  }

  // Preenche de forma 100% segura usando o prototype setter sem truncar caracteres
  await textarea.focus();
  await textarea.evaluate((el, val) => {
    const proto = HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(el, val);
    } else {
      el.value = val;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, cleanUrl);

  await page.waitForTimeout(400);

  // Se o botão Gerar estiver com disabled, faz um trigger com espaço e backspace controlado
  let btn = page.locator('button:has-text("Gerar"):not([disabled]):not([aria-disabled="true"])').first();
  if ((await btn.count()) === 0) {
    await textarea.click();
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(400);
    btn = page.locator('button:has-text("Gerar"):not([disabled]):not([aria-disabled="true"])').first();
  }

  if ((await btn.count()) === 0) {
    console.warn(`   ⚠️ Botão "Gerar" não habilitou para ${item.mlb_id}.`);
    return null;
  }

  await btn.click({ force: true });

  // Polling automático dos links curtos gerados para este produto
  let shortLink = null;
  const regex = /(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await page.waitForTimeout(600);
    shortLink = await page.evaluate((reStr) => {
      const re = new RegExp(reStr);
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map((i) => i.value || '');
      for (const val of inputs) {
        if (val.includes('Este URL não é do Mercado Livre')) continue;
        const m = val.match(re);
        if (m) return m[1].trim();
      }
      const anchors = Array.from(document.querySelectorAll('a[href]')).map((a) => a.href || '');
      for (const href of anchors) {
        const m = href.match(re);
        if (m) return m[1].trim();
      }
      const html = document.documentElement.innerHTML || '';
      const htmlMatch = html.match(re);
      if (htmlMatch) return htmlMatch[1].trim();
      return null;
    }, regex.source);

    if (shortLink) break;
  }

  if (shortLink) {
    console.log(`   ✅ Link Curto Oficial Gerado: ${shortLink}`);
    return shortLink;
  } else {
    console.warn(`   ⚠️ Não foi possível obter o link curto oficial para este produto.`);
    return null;
  }
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
        targetCount: 30,
        existingPage: page,
      });
    } catch (err) {
      console.warn('⚠️ Aviso no garimpo:', err.message);
    }

    // --------------------------------------------------------------------------
    // ROTINA 3: Monetização 1-para-1 no Link Builder oficial (Zero Deslocamento)
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

    console.log(`🎯 Encontradas ${pending.length} oferta(s) na fila do Radar aguardando monetização 1-para-1.`);

    let updatedCount = 0;
    let firstShortLink = null;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const shortLink = await convertSingleProductInLinkBuilder(page, item, i + 1, pending.length);

      if (shortLink) {
        if (!firstShortLink) firstShortLink = shortLink;

        // Publica apenas com link curto oficial validado!
        const { error: updErr } = await supabase
          .from('produtos_clarice')
          .update({
            affiliate_url: shortLink,
            active: true,
            status: 'ativo',
          })
          .eq('id', item.id);

        if (!updErr) {
          updatedCount++;
        } else {
          console.warn(`Erro ao atualizar item ${item.mlb_id}:`, updErr.message);
        }
      } else {
        console.warn(`⚠️ Produto "${item.title.slice(0, 30)}..." mantido como pendente (NÃO publicado na vitrine).`);
      }
    }

    // Se o botão amarelo ainda usava URL com hashtag e temos novos links curtos, promove o 1º link
    if (firstShortLink && !hasShortGeneral) {
      await supabase
        .from('store_settings')
        .update({
          general_affiliate_url: firstShortLink,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'default');
      console.log(`🔗 Link Geral do Botão Amarelo promovido para o 1º link curto: ${firstShortLink}`);
    }

    console.log(`\n🎉 SUCESSO: ${updatedCount} de ${pending.length} achadinhos aprovados, monetizados e publicados na vitrine!`);
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
