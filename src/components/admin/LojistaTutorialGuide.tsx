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
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LojaAfiliado } from '@/types/tenant';
import type { TutorialLesson } from '@/types/tutorial';
import {
  fetchTutorials,
  getYoutubeEmbedUrl,
  getVimeoEmbedUrl,
  isDirectVideoFile,
  DEFAULT_TUTORIALS,
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

  const handleActionClick = (targetTab: string) => {
    if (targetTab === 'vitrine') {
      const url = store?.slug && store.slug !== 'clarice' ? `/?loja=${store.slug}` : '/';
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onNavigateTab(targetTab);
    }
  };

  // Aula 1: Destaque Principal (Guia Rápido)
  const featuredLesson: TutorialLesson = lessons[0] || DEFAULT_TUTORIALS[0];

  // Aulas 2 a 5: Apenas aquelas que possuem vídeo cadastrado
  const secondaryLessons = lessons
    .slice(1)
    .filter((lesson) => Boolean(lesson.videoUrl && lesson.videoUrl.trim() !== ''));

  // Métricas de progresso baseadas nas aulas visíveis
  const visibleLessons = [featuredLesson, ...secondaryLessons];
  const completedCount = visibleLessons.filter((l) => completedMap[l.id]).length;
  const totalCount = visibleLessons.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Helper para renderizar players de vídeo
  const renderVideoPlayer = (lesson: TutorialLesson, isMain = false) => {
    const youtubeEmbed = lesson.videoUrl ? getYoutubeEmbedUrl(lesson.videoUrl) : null;
    const vimeoEmbed = lesson.videoUrl ? getVimeoEmbedUrl(lesson.videoUrl) : null;
    const isDirectVideo = lesson.videoUrl ? isDirectVideoFile(lesson.videoUrl) : false;
    const hasVideo = Boolean(youtubeEmbed || vimeoEmbed || isDirectVideo);

    if (hasVideo) {
      if (youtubeEmbed) {
        return (
          <iframe
            src={youtubeEmbed}
            title={lesson.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0 rounded-2xl"
          />
        );
      }
      if (vimeoEmbed) {
        return (
          <iframe
            src={vimeoEmbed}
            title={lesson.titulo}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0 rounded-2xl"
          />
        );
      }
      if (isDirectVideo) {
        return (
          <video
            src={lesson.videoUrl!}
            controls
            playsInline
            className="h-full w-full rounded-2xl object-cover bg-black"
          />
        );
      }
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE600]/10 border border-[#FFE600]/25 text-[#FFE600] shadow-lg shadow-yellow-500/5">
          <Film className="h-7 w-7 animate-pulse" />
        </div>
        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-black uppercase text-amber-400 mb-2.5">
          🎬 Vídeo em Produção • Em Breve Disponível
        </span>
        <p className="text-xs text-slate-300 max-w-md leading-relaxed">
          {isMain
            ? 'O vídeo oficial de 45 segundos da mascote Clarice está sendo sincronizado no painel do Super Admin. Enquanto isso, consulte o roteiro prático e acesse os atalhos abaixo!'
            : 'A gravação desta aula está sendo finalizada pela equipe da Clarice. Consulte o resumo prático passo a passo abaixo.'}
        </p>
      </div>
    );
  };

  const isFeaturedCompleted = Boolean(completedMap[featuredLesson.id]);

  return (
    <div className={cn('space-y-8', className)}>
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. BANNER DE BOAS-VINDAS COM A MASCOTE CLARICE                   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0E1A] p-4 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-row items-center gap-3 sm:gap-6 justify-between">
          <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-3 text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE600]/40 bg-[#FFE600]/10 px-2.5 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-black uppercase text-[#FFE600]">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Central de Treinamento Oficial</span>
            </div>

            <h1 className="text-base sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Aprenda em 1 Minuto com a Clarice 🎓
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl hidden sm:block">
              Dominar sua vitrine é muito mais fácil do que parece! Assista ao nosso Guia Rápido em
              vídeo para configurar sua loja, cadastrar produtos com comissões automáticas no Mercado
              Livre e Shopee, e acelerar suas vendas no WhatsApp hoje mesmo.
            </p>

            {/* Barra de Progresso do Lojista */}
            <div className="pt-1 sm:pt-2 max-w-md">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-300 mb-1">
                <span>Seu Progresso:</span>
                <span className="text-[#FFE600]">
                  {completedCount} de {totalCount} {totalCount === 1 ? 'aula' : 'aulas'} ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#FFE600] transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Imagem da Mascote Clarice */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="h-14 w-14 sm:h-36 sm:w-36 rounded-full bg-[#FFE600]/10 border-2 border-[#FFE600]/30 flex items-center justify-center shadow-inner overflow-hidden p-1.5 sm:p-2">
              <img
                src="/brand/clarice-hero.png"
                alt="Mascote Clarice"
                className="h-full w-full object-contain drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <GraduationCap className="h-7 w-7 sm:h-16 sm:w-16 text-[#FFE600] opacity-40 absolute" />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. DESTAQUE PRINCIPAL: GUIA RÁPIDO (SLOT 1)                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FFE600]" />
            <h2 className="text-base sm:text-lg font-black text-white">
              Vídeo Principal em Destaque • Guia Rápido
            </h2>
          </div>
          <span className="text-xs text-amber-400 font-bold hidden sm:inline flex items-center gap-1">
            ⚡ Tour Completo em {featuredLesson.duracao || '00:45'}
          </span>
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-3xl border p-4 sm:p-8 shadow-2xl transition-all duration-300',
            isFeaturedCompleted
              ? 'border-emerald-500/40 bg-gradient-to-br from-[#0F172A] via-emerald-950/20 to-[#0F172A]'
              : 'border-[#FFE600]/30 bg-gradient-to-br from-[#0F172A] via-[#1E293B]/70 to-[#0A0E1A]'
          )}
        >
          {/* Header do Card em Destaque */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-lg bg-[#FFE600]/20 border border-[#FFE600]/40 px-3 py-1 font-mono text-xs font-black uppercase text-[#FFE600] flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Guia Rápido Oficial
              </span>
              <span className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#FFE600]" /> {featuredLesson.duracao || '00:45'}
              </span>
              {isFeaturedCompleted && (
                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Concluído
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {featuredLesson.titulo}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              {featuredLesson.descricao}
            </p>
          </div>

          {/* Player do Vídeo Principal */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-[#FFE600]/30 bg-slate-950 shadow-2xl mb-4">
            {renderVideoPlayer(featuredLesson, true)}
          </div>

          {/* Botão de Conclusão Posicionado Logo Abaixo do Player */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <button
              type="button"
              onClick={() => toggleComplete(featuredLesson.id)}
              className={cn(
                'flex w-full sm:w-auto justify-center min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-black transition shrink-0 active:scale-95',
                isFeaturedCompleted
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                  : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isFeaturedCompleted ? 'Aula Concluída' : 'Marcar Concluída'}</span>
            </button>
            <span className="text-xs text-slate-400 text-center sm:text-right">
              {isFeaturedCompleted
                ? 'Aula concluída! Você pode desmarcar a qualquer momento.'
                : 'Assista ao vídeo e marque para registrar seu progresso.'}
            </span>
          </div>

          {/* Roteiro Prático dos 4 Passos */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 space-y-3 mb-6">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#FFE600] flex items-center gap-2">
              <span>📌</span> Roteiro Prático • Sua Loja no Ar em 4 Passos:
            </span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {featuredLesson.roteiroPassos.map((passo, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/50 p-3 text-xs text-slate-200"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE600]/20 font-mono text-[11px] font-black text-[#FFE600] border border-[#FFE600]/40 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{passo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ações Rápidas de Atalho */}
          <div className="border-t border-slate-800/80 pt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-400">
              Acesse as ferramentas da loja agora:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleActionClick('minha-loja')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition"
              >
                <Palette className="h-3.5 w-3.5 text-[#FFE600]" />
                <span>1. Minha Loja</span>
              </button>
              <button
                type="button"
                onClick={() => handleActionClick('produtos')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-cyan-400" />
                <span>2. Meus Produtos</span>
              </button>
              <button
                type="button"
                onClick={() => handleActionClick('disparador-vip')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>3. Disparador VIP</span>
              </button>
              <button
                type="button"
                onClick={() => handleActionClick('vitrine')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FFE600] hover:bg-yellow-400 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 transition active:scale-95"
              >
                <Store className="h-3.5 w-3.5" />
                <span>4. {featuredLesson.actionLabel || '↗ Abrir Minha Vitrine'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. AULAS COMPLEMENTARES (2 A 5) — APENAS SE TIVEREM VÍDEO SALVO  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {secondaryLessons.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-[#FFE600]" />
              <h2 className="text-base sm:text-lg font-black text-white">
                Aulas Complementares • Passo a Passo Detalhado
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              ⏱ Aulas gravadas adicionais
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
            {secondaryLessons.map((lesson) => {
              const isCompleted = Boolean(completedMap[lesson.id]);

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
                    {/* Cabeçalho da Aula Complementar */}
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

                    {/* Player de Vídeo */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
                      {renderVideoPlayer(lesson, false)}
                    </div>

                    {/* Roteiro */}
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

                  {/* Ação */}
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
      )}
    </div>
  );
}
