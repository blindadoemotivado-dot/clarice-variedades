import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { TutorialLesson } from '@/types/tutorial';

export const DEFAULT_TUTORIALS: TutorialLesson[] = [
  {
    id: 'aula-1',
    ordem: 1,
    titulo: 'Guia Rápido: Sua Loja no Ar em 45 Segundos',
    duracao: '00:45',
    descricao:
      'Aprenda em 45 segundos como navegar pelo painel, personalizar sua marca, cadastrar produtos com comissões automáticas (Mercado Livre e Shopee) e ativar o Disparador VIP no WhatsApp.',
    videoUrl: null,
    targetTab: 'vitrine',
    actionLabel: '↗ Abrir Minha Vitrine',
    roteiroPassos: [
      '1. Minha Loja: Escolha suas cores, WhatsApp VIP e credenciais de afiliado (ML e Shopee).',
      '2. Meus Produtos: Cole links promocionais e clique em Puxar Dados para importar com foto e preço.',
      '3. Disparador VIP: Gere copies de alta conversão e envie com 1 clique para o seu Grupo VIP.',
      '4. Vitrine Pública: Compartilhe o link exclusivo da sua loja na Bio do Instagram e redes sociais.',
    ],
  },
  {
    id: 'aula-2',
    ordem: 2,
    titulo: 'Deixando a Loja com a sua Cara (Logo, Banner e Cores)',
    duracao: '01:00',
    descricao:
      'Personalize o nome da loja, cores de destaque, envie seu logotipo e o banner hero da vitrine.',
    videoUrl: null,
    targetTab: 'minha-loja',
    actionLabel: 'Ir para Minha Loja',
    roteiroPassos: [
      'Na aba "Minha Loja", defina o nome oficial e o subtítulo chamativo da sua marca.',
      'Suba o logotipo quadrado e a imagem do Banner Hero nos botões dedicados de upload.',
      'Escolha a cor primária e a cor de destaque da loja e clique em "Salvar Personalização".',
    ],
  },
  {
    id: 'aula-3',
    ordem: 3,
    titulo: 'Cadastrando Produtos do Mercado Livre e Shopee',
    duracao: '01:00',
    descricao:
      'Aprenda a puxar produtos de afiliados por link individual ou através da importação em lote com 1 clique.',
    videoUrl: null,
    targetTab: 'produtos',
    actionLabel: 'Ir para Meus Produtos',
    roteiroPassos: [
      'Copie o link oficial do produto com seu código de afiliado no Mercado Livre ou Shopee.',
      'Cole no campo de URL na aba "Meus Produtos" para puxar automaticamente título e imagem.',
      'Revise o preço promocional, parcelamento e clique em "Publicar na Vitrine".',
    ],
  },
  {
    id: 'aula-4',
    ordem: 4,
    titulo: 'Usando o Disparador VIP no Grupo de WhatsApp',
    duracao: '01:00',
    descricao:
      'Gere copies persuasivas em 1 clique e envie para o seu Grupo VIP sem repetir promoções já enviadas hoje.',
    videoUrl: null,
    targetTab: 'disparador-vip',
    actionLabel: 'Ir para Disparador VIP',
    roteiroPassos: [
      'Acesse a aba "Disparador VIP" e selecione um produto da lista do seu catálogo.',
      'Escolha o estilo de copy: "Achadinho do Dia", "Urgência" ou "Últimas Unidades".',
      'Clique no botão "Copiar Copy" e envie com 1 clique para o seu Grupo VIP no WhatsApp.',
    ],
  },
  {
    id: 'aula-5',
    ordem: 5,
    titulo: 'Como Divulgar seu Link e Gerenciar seu Plano',
    duracao: '01:00',
    descricao:
      'Estratégias para divulgar seu link na Bio e canais sociais, além de como acompanhar faturas e upgrades.',
    videoUrl: null,
    targetTab: 'minha-assinatura',
    actionLabel: 'Ir para Minha Assinatura',
    roteiroPassos: [
      'Copie o link da sua vitrine e coloque na Bio do Instagram, TikTok e no status do WhatsApp.',
      'Acompanhe na aba "Minha Assinatura" a data de renovação e status da sua conta.',
      'Faça upgrade de plano quando quiser limites maiores ou recursos avançados como CNAME.',
    ],
  },
];

const CACHE_KEY = 'clarice_tutorials_cache';

/**
 * Converte URLs variadas do YouTube (watch, shorts, youtu.be) em embed seguro
 */
export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Caso já seja embed
  if (trimmed.includes('youtube.com/embed/')) return trimmed;

  // youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  // youtube.com/shorts/ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  return null;
}

/**
 * Converte URLs do Vimeo em embed seguro
 */
export function getVimeoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.includes('player.vimeo.com/video/')) return trimmed;
  const match = trimmed.match(/vimeo\.com\/(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return null;
}

/**
 * Verifica se a URL aponta para um arquivo direto de vídeo (.mp4, .webm, ou storage)
 */
export function isDirectVideoFile(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('.mp4') ||
    lower.includes('.webm') ||
    lower.includes('.mov') ||
    lower.includes('/storage/v1/object/public/')
  );
}

/**
 * Busca todas as aulas cadastradas no Supabase com fallback seguro
 */
export async function fetchTutorials(): Promise<TutorialLesson[]> {
  let remoteData: any[] | null = null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tutoriais_saas')
        .select('*')
        .order('ordem', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        remoteData = data;
      }
    } catch {
      // Falha silenciosa com fallback automático
    }
  }

  // Lê cache local de sobreposições de vídeo
  let cachedOverrides: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cachedOverrides = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  return DEFAULT_TUTORIALS.map((def) => {
    const remote = remoteData?.find((r) => r.id === def.id);
    const videoUrl =
      remote?.video_url !== undefined
        ? remote.video_url
        : cachedOverrides[def.id] !== undefined
        ? cachedOverrides[def.id]
        : def.videoUrl;

    return {
      ...def,
      ordem: remote?.ordem ?? def.ordem,
      titulo: remote?.titulo ?? def.titulo,
      duracao: remote?.duracao ?? def.duracao,
      descricao: remote?.descricao ?? def.descricao,
      videoUrl: videoUrl ? videoUrl.trim() : null,
      updatedAt: remote?.updated_at,
    };
  });
}

/**
 * Atualiza o link do vídeo de uma aula (usado pelo Super Admin)
 */
export async function updateTutorialVideo(
  id: string,
  videoUrl: string | null
): Promise<boolean> {
  const cleanUrl = videoUrl?.trim() || null;

  // 1. Atualiza cache local imediatamente
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      if (cleanUrl) {
        cache[id] = cleanUrl;
      } else {
        delete cache[id];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore
    }
  }

  // 2. Persiste no Supabase caso configurado
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('tutoriais_saas')
        .update({
          video_url: cleanUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.warn('[tutorialService] Falha ao atualizar tutoriais_saas:', error.message);
      } else {
        return true;
      }
    } catch (err) {
      console.warn('[tutorialService] Erro ao conectar ao Supabase:', err);
    }
  }

  return true;
}
