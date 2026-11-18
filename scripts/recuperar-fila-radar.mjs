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

async function main() {
  console.log('🔍 Consultando produtos na fila do Radar no Supabase...');
  const { data: rows, error } = await supabase
    .from('produtos_clarice')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar produtos:', error.message);
    process.exit(1);
  }

  console.log(`📦 Total de registros encontrados em produtos_clarice: ${rows.length}`);
  
  let updatedCount = 0;
  for (const row of rows) {
    const mlbIdDigits = String(row.mlb_id || '').replace(/\D/g, '');
    if (!mlbIdDigits) continue;

    const cleanMlb = `MLB-${mlbIdDigits}`;
    const cleanUrl = `https://produto.mercadolivre.com.br/${cleanMlb}`;

    // Atualizar se for pendente_afiliado e a affiliate_url não for exatamente a URL limpa de produto
    if (row.status === 'pendente_afiliado' && (row.affiliate_url !== cleanUrl || row.mlb_id !== cleanMlb)) {
      const { error: updErr } = await supabase
        .from('produtos_clarice')
        .update({
          mlb_id: cleanMlb,
          affiliate_url: cleanUrl,
        })
        .eq('id', row.id);

      if (!updErr) {
        updatedCount++;
      } else {
        console.warn(`Erro no ID ${row.id}:`, updErr.message);
      }
    }
  }

  console.log(`🎉 Sucesso: ${updatedCount} produtos atualizados com a URL limpa oficial do anúncio!`);

  // Exibir contagem atual por status
  const { data: afterRows } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, affiliate_url, status, active');

  const statusCount = {};
  for (const r of (afterRows || [])) {
    const key = `${r.status || 'sem_status'} (active: ${r.active})`;
    statusCount[key] = (statusCount[key] || 0) + 1;
  }
  console.log('📊 Estado atual da tabela produtos_clarice:', statusCount);
  console.log('Amostra dos 3 primeiros produtos atualizados:');
  for (const r of (afterRows || []).slice(0, 3)) {
    console.log(`  - ${r.mlb_id}: ${r.affiliate_url}`);
  }
}

main().catch(console.error);
