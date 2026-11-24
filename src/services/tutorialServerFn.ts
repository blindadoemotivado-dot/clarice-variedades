import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';

export interface CreateTutorialUploadUrlResult {
  success: boolean;
  signedUrl?: string;
  token?: string;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface SaveTutorialResult {
  success: boolean;
  error?: string;
}

// Chave administrativa Service Role oficial para operações de backend seguras
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eHZwemVjaXd4Z3hobWNycHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDk5NjY2MSwiZXhwIjoyMTEwNTcyNjYxfQ.62yQ_MWEcDL3kmU_sdC4hLQuUQYECZn63wnm3HjJ7uE';

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://tuxvpzeciwxgxhmcrprt.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

/**
 * Função central para geração de Signed Upload URL via Service Role
 */
export async function generateTutorialUploadUrl(
  lessonId: string,
  fileName: string
): Promise<CreateTutorialUploadUrlResult> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const cleanLessonId = (lessonId || 'aula-1').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
    const filePath = `${cleanLessonId}-${Date.now()}.${ext}`;

    // Gera a Signed URL com expiração de 2 horas e upsert habilitado
    const { data: signData, error } = await supabaseAdmin.storage
      .from('tutoriais')
      .createSignedUploadUrl(filePath, { upsert: true });

    if (error || !signData) {
      return {
        success: false,
        error: error?.message || 'Falha ao gerar URL de upload assinado.',
      };
    }

    const { data: pubData } = supabaseAdmin.storage
      .from('tutoriais')
      .getPublicUrl(filePath);

    return {
      success: true,
      signedUrl: signData.signedUrl,
      token: signData.token,
      path: filePath,
      publicUrl: pubData.publicUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado no servidor ao gerar URL assinada.',
    };
  }
}

/**
 * Função central para gravação da configuração no bucket 'tutoriais' via Service Role
 */
export async function saveTutorialVideoConfig(
  id: string,
  videoUrl: string | null
): Promise<SaveTutorialResult> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Atualiza tutorials_config.json no bucket 'tutoriais'
    let currentConfig: Record<string, string> = {};
    try {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('tutoriais')
        .download('tutorials_config.json');

      if (!downloadError && fileData) {
        const text = await fileData.text();
        currentConfig = JSON.parse(text);
      }
    } catch {
      // Arquivo pode não existir ainda
    }

    const cleanUrl = videoUrl?.trim() || null;
    if (cleanUrl) {
      currentConfig[id] = cleanUrl;
    } else {
      delete currentConfig[id];
    }

    const uploadBuffer = Buffer.from(JSON.stringify(currentConfig, null, 2));
    const { error: uploadError } = await supabaseAdmin.storage
      .from('tutoriais')
      .upload('tutorials_config.json', uploadBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[tutorialServerFn] Falha ao salvar tutorials_config.json:', uploadError.message);
    }

    // 2. Se a tabela tutoriais_saas existir, tenta atualizar
    try {
      await supabaseAdmin
        .from('tutoriais_saas')
        .update({
          video_url: cleanUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch {
      // Tabela opcional
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao salvar configuração do tutorial.',
    };
  }
}

/**
 * Server Function RPC para TanStack Start
 */
export const createTutorialUploadUrlServerFn = createServerFn({ method: 'POST' })
  .validator((d: { lessonId: string; fileName: string; mimeType?: string }) => d)
  .handler(async (ctx): Promise<CreateTutorialUploadUrlResult> => {
    return generateTutorialUploadUrl(ctx.data.lessonId, ctx.data.fileName);
  });

/**
 * Server Function RPC para salvar tutoriais no TanStack Start
 */
export const saveTutorialVideoServerFn = createServerFn({ method: 'POST' })
  .validator((d: { id: string; videoUrl: string | null }) => d)
  .handler(async (ctx): Promise<SaveTutorialResult> => {
    return saveTutorialVideoConfig(ctx.data.id, ctx.data.videoUrl);
  });
