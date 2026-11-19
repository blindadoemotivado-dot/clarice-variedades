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
  console.log('🗑️ [Etapa 1] Limpando completamente a tabela produtos_clarice...');
  const { data: before, error: countErr } = await supabase
    .from('produtos_clarice')
    .select('id');

  if (countErr) {
    console.error('Erro ao verificar produtos:', countErr.message);
    process.exit(1);
  }

  console.log(`📦 Registros encontrados para remoção: ${before.length}`);

  if (before.length > 0) {
    const { error: delErr } = await supabase
      .from('produtos_clarice')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (delErr) {
      console.error('Erro ao deletar registros:', delErr.message);
      process.exit(1);
    }
  }

  const { data: after } = await supabase.from('produtos_clarice').select('id');
  console.log(`✅ Tabela produtos_clarice limpa com sucesso! Registros restantes: ${after?.length ?? 0}`);
}

main().catch(console.error);
