import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const AFFILIATE_TAG = 'kd20250113073553';
const AFFILIATE_SUBTAG = 'clariceachadinhos';

async function main() {
  console.log('🔍 Inspecionando links de afiliados em produtos_clarice...');
  const { data: rows, error } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, affiliate_url, title, status, active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao consultar produtos:', error.message);
    process.exit(1);
  }

  console.log(`📦 Total de produtos carregados: ${rows.length}`);

  let fixedCount = 0;
  let alreadyValidCount = 0;

  for (const row of rows) {
    const digits = String(row.mlb_id || '').replace(/\D/g, '');
    const cleanProductUrl = `https://produto.mercadolivre.com.br/MLB-${digits}?matt_tool=${AFFILIATE_TAG}&matt_word=${AFFILIATE_SUBTAG}`;
    const rawUrl = String(row.affiliate_url || '').trim();

    let targetUrl = '';

    // Verifica se possui um link curto meli.la ou mercadolivre.com/sec limpo
    const shortMatch = rawUrl.match(/(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      targetUrl = shortMatch[1].trim();
    } else if (
      rawUrl.startsWith('https://produto.mercadolivre.com.br') ||
      rawUrl.startsWith('https://www.mercadolivre.com.br')
    ) {
      if (rawUrl.includes('matt_tool')) {
        targetUrl = rawUrl;
      } else {
        const sep = rawUrl.includes('?') ? '&' : '?';
        targetUrl = `${rawUrl}${sep}matt_tool=${AFFILIATE_TAG}&matt_word=${AFFILIATE_SUBTAG}`;
      }
    } else {
      targetUrl = cleanProductUrl;
    }

    // Se o rawUrl era inválido (com quebra de linha, texto de erro ou relativo), atualiza
    if (targetUrl !== rawUrl) {
      const { error: updErr } = await supabase
        .from('produtos_clarice')
        .update({
          affiliate_url: targetUrl,
          active: true,
          status: 'ativo',
        })
        .eq('id', row.id);

      if (!updErr) {
        fixedCount++;
      } else {
        console.warn(`Erro ao atualizar ID ${row.id}:`, updErr.message);
      }
    } else {
      alreadyValidCount++;
    }
  }

  console.log(`\n🎉 Saneamento concluído!`);
  console.log(`✅ Já estavam válidos: ${alreadyValidCount}`);
  console.log(`🛠️ Corrigidos e sanitizados: ${fixedCount}`);

  // Consulta uma amostra de 5 produtos para auditoria
  const { data: sample } = await supabase
    .from('produtos_clarice')
    .select('mlb_id, affiliate_url, status, active')
    .limit(5);

  console.log('\n📋 Amostra de 5 produtos após o saneamento:');
  for (const p of (sample || [])) {
    console.log(`  - [${p.mlb_id}] (${p.status}, ativo=${p.active}): ${p.affiliate_url}`);
  }
}

main().catch(console.error);
