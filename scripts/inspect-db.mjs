import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')];
    })
);

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testUpdate() {
  const { data, error } = await sb
    .from('lojas_afiliados')
    .update({ ml_matt_tool: '51555285' })
    .eq('slug', 'entre-amigas-promos')
    .select();
  console.log('Update ml_matt_tool:', { data, error });
}

testUpdate();
