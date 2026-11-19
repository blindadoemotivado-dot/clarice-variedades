import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';

export interface RadarSyncResult {
  success: boolean;
  newDealsCount: number;
  totalPendingCount: number;
  message: string;
}

export const syncRadarOffersServerFn = createServerFn({ method: 'POST' })
  .validator((d: { tag?: string; term?: string } | undefined) => d)
  .handler(async (): Promise<RadarSyncResult> => {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://tuxvpzeciwxgxhmcrprt.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';

    if (!supabaseKey) {
      return {
        success: false,
        newDealsCount: 0,
        totalPendingCount: 0,
        message: 'Chave de conexão Supabase não configurada no servidor.',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { count, error } = await supabase
      .from('produtos_clarice')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente_afiliado');

    if (error) {
      return {
        success: false,
        newDealsCount: 0,
        totalPendingCount: 0,
        message: `Erro ao consultar Supabase: ${error.message}`,
      };
    }

    const total = count ?? 0;
    return {
      success: true,
      newDealsCount: 0,
      totalPendingCount: total,
      message:
        total === 0
          ? 'Fila do Radar vazia — todos os achadinhos já foram publicados. Aguarde o próximo ciclo automático ou execute .\\rodar-clarice.ps1.'
          : `Fila do Radar atualizada! ${total} achadinho(s) aguardando aprovação na fila.`,
    };
  });
