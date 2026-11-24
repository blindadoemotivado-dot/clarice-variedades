/**
 * Tipos da Central de Treinamento em Vídeo da Mascote Clarice (Guia do Lojista)
 */

export interface TutorialLesson {
  id: string; // 'aula-1', 'aula-2', ...
  ordem: number;
  titulo: string;
  duracao: string; // ex: '01:00'
  descricao: string;
  videoUrl?: string | null;
  roteiroPassos: string[]; // 3 passos rápidos numerados
  targetTab: 'vitrine' | 'minha-loja' | 'produtos' | 'disparador-vip' | 'minha-assinatura';
  actionLabel: string; // ex: '↗ Abrir Minha Vitrine', 'Ir para Minha Loja', etc.
  updatedAt?: string;
}
