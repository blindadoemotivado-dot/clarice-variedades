import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Film,
  Check,
  Store,
  ShoppingBag,
  Palette,
  MessageCircle,
  CreditCard,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LojaAfiliado } from '@/types/tenant';
import type { TutorialLesson } from '@/types/tutorial';
import {
  fetchTutorials,
  getYoutubeEmbedUrl,
  getVimeoEmbedUrl,
  isDirectVideoFile,
} from '@/services/tutorialService';

export interface LojistaTutorialGuideProps {
  store?: LojaAfiliado | null;
  onNavigateTab: (tab: string) => void;
  className?: string;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  vitrine: <Store className="h-4 w-4" />,
  'minha-loja': <Palette className="h-4 w-4" />,
  produtos: <ShoppingBag className="h-4 w-4" />,
  'disparador-vip': <MessageCircle className="h-4 w-4" />,
  'minha-assinatura': <CreditCard className="h-4 w-4" />,
};

export function LojistaTutorialGuide({
  store,
  onNavigateTab,
  className,
}: LojistaTutorialGuideProps) {
  const [lessons, setLessons] = useState<TutorialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  const progressKey = `clarice_tutorial_progress_${store?.slug || 'default'}`;

  // 1. Carrega aulas e progresso salvo
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await fetchTutorials();
        if (active) setLessons(data);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(progressKey);
        if (saved) {
          setCompletedMap(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }

    return () => {
      active = false;
    };
  }, [progressKey]);

  // Alterna status de conclusão da aula
  const toggleComplete = (id: string) => {
    setCompletedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(progressKey, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const completedCount = lessons.filter((l) => completedMap[l.id]).length;
  const totalCount = lessons.length || 5;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleActionClick = (targetTab: string) => {
    if (targetTab === 'vitrine') {
      const url = store?.slug && store.slug !== 'clarice' ? `/?loja=${store.slug}` : '/';
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onNavigateTab(targetTab);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* BANNER DE BOAS-VINDAS COM A MASCOTE CLARICE                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0E1A] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow sutil */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFE600]/40 bg-[#FFE600]/10 px-3.5 py-1 text-xs font-black uppercase text-[#FFE600]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Central de Treinamento Oficial</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Aprenda em 1 Minuto com a Clarice 🎓
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Dominar sua vitrine é muito mais fácil do que parece! Gravamos 5 aulas rápidas e
              diretas ao ponto de 60 segundos com a mascote Clarice para você configurar sua loja,
              divulgar no WhatsApp e acelerar suas comissões hoje mesmo.
            </p>

            {/* Barra de Progresso do Lojista */}
            <div className="pt-2 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                <span>Seu Progresso de Aprendizado:</span>
                <span className="text-[#FFE600]">
                  {completedCount} de {totalCount} aulas ({progressPercent}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#FFE600] transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Imagem da Mascote Clarice */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-[#FFE600]/10 border-2 border-[#FFE600]/30 flex items-center justify-center shadow-inner overflow-hidden p-2">
              <img
                src="/brand/clarice-hero.png"
                alt="Mascote Clarice"
                className="h-full w-full object-contain drop-shadow-md"
                onError={(e) => {
                  // Fallback para ícone estilizado se a imagem não carregar
                  e.currentTarget.style.display = 'none';
                }}
              />
              <GraduationCap className="h-16 w-16 text-[#FFE600] opacity-40 absolute" />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* GRADE DAS 5 AULAS PRÁTICAS DE 1 MINUTO                            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-[#FFE600]" />
            <h2 className="text-base sm:text-lg font-black text-white">
              Aulas em Vídeo • Passo a Passo Rápido
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
            ⏱ Média de 60 segundos por vídeo
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {lessons.map((lesson) => {
            const isCompleted = Boolean(completedMap[lesson.id]);
            const youtubeEmbed = lesson.videoUrl ? getYoutubeEmbedUrl(lesson.videoUrl) : null;
            const vimeoEmbed = lesson.videoUrl ? getVimeoEmbedUrl(lesson.videoUrl) : null;
            const isDirectVideo = lesson.videoUrl ? isDirectVideoFile(lesson.videoUrl) : false;
            const hasVideo = Boolean(youtubeEmbed || vimeoEmbed || isDirectVideo);

            return (
              <div
                key={lesson.id}
                className={cn(
                  'rounded-3xl border bg-[#0F172A] p-5 sm:p-6 shadow-xl transition-all duration-300 flex flex-col justify-between',
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                )}
              >
                <div className="space-y-4">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-lg bg-slate-800 px-2.5 py-0.5 font-mono text-[11px] font-black uppercase text-[#FFE600]">
                          Aula {lesson.ordem}
                        </span>
                        <span className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> {lesson.duracao}
                        </span>
                        {isCompleted && (
                          <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Concluída
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {lesson.titulo}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {lesson.descricao}
                      </p>
                    </div>

                    {/* Botão de Checkbox "Aula Concluída" */}
                    <button
                      type="button"
                      onClick={() => toggleComplete(lesson.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0',
                        isCompleted
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                          : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      )}
                      title={isCompleted ? 'Marcar como não concluída' : 'Marcar como concluída'}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {isCompleted ? 'Concluída' : 'Marcar Concluída'}
                      </span>
                    </button>
                  </div>

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* PLAYER DE VÍDEO (OU ESTADO EM PRODUÇÃO)                   */}
                  {/* ───────────────────────────────────────────────────────── */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
                    {hasVideo ? (
                      youtubeEmbed ? (
                        <iframe
                          src={youtubeEmbed}
                          title={lesson.titulo}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full border-0 rounded-2xl"
                        />
                      ) : vimeoEmbed ? (
                        <iframe
                          src={vimeoEmbed}
                          title={lesson.titulo}
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full border-0 rounded-2xl"
                        />
                      ) : isDirectVideo ? (
                        <video
                          src={lesson.videoUrl!}
                          controls
                          className="h-full w-full rounded-2xl object-cover bg-black"
                        />
                      ) : null
                    ) : (
                      /* Estado Elegante: Vídeo em Produção */
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE600]/10 border border-[#FFE600]/20 text-[#FFE600]">
                          <Film className="h-6 w-6 animate-pulse" />
                        </div>
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-[11px] font-black uppercase text-amber-400 mb-2">
                          🎬 Vídeo em Produção • Em Breve Disponível
                        </span>
                        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                          A gravação oficial de 1 minuto desta aula está sendo finalizada pela equipe
                          da Clarice. Enquanto isso, consulte o roteiro prático passo a passo abaixo!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* ROTEIRO PRÁTICO EM 3 PASSOS RÁPIDOS                       */}
                  {/* ───────────────────────────────────────────────────────── */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      📌 Resumo Prático Passo a Passo:
                    </span>
                    <ol className="space-y-2 text-xs text-slate-300">
                      {lesson.roteiroPassos.map((passo, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE600]/20 font-mono text-[10px] font-black text-[#FFE600] border border-[#FFE600]/30 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{passo}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* ───────────────────────────────────────────────────────── */}
                {/* BOTÃO DE ATALHO DIRETO PARA A FERRAMENTA                   */}
                {/* ───────────────────────────────────────────────────────── */}
                <div className="pt-4 mt-2 border-t border-slate-800/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Pratique agora mesmo:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleActionClick(lesson.targetTab)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FFE600] hover:bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 transition active:scale-95 ml-auto"
                  >
                    {TAB_ICONS[lesson.targetTab]}
                    <span>{lesson.actionLabel}</span>
                    {lesson.targetTab === 'vitrine' ? (
                      <ExternalLink className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
