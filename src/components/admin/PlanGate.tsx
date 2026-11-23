import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlanGateProps {
  /** Indica se o recurso está liberado para o plano atual do lojista */
  allowed: boolean;
  /** Nome legível do plano necessário para desbloquear */
  requiredPlan: 'Pro' | 'Advanced';
  /** Nome ou descrição do recurso bloqueado */
  featureName: string;
  /** Callback executado ao clicar no botão de upgrade */
  onUpgrade?: (() => void) | undefined;
  /** Conteúdo renderizado normalmente caso allowed === true */
  children: React.ReactNode;
  /** Se deve renderizar um card em bloco (padrão) ou um aviso compacto em linha */
  variant?: 'card' | 'inline' | undefined;
  className?: string | undefined;
}

export function PlanGate({
  allowed,
  requiredPlan,
  featureName,
  onUpgrade,
  children,
  variant = 'card',
  className,
}: PlanGateProps) {
  if (allowed) {
    return <>{children}</>;
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Lock className="h-4 w-4 text-[#FFE600] shrink-0" />
          <span className="truncate">
            <strong>{featureName}</strong> é exclusivo do <strong>Plano {requiredPlan}</strong>.
          </span>
        </div>
        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex items-center gap-1 rounded-lg bg-[#FFE600] px-2.5 py-1 text-[11px] font-black text-slate-950 hover:bg-yellow-400 transition active:scale-95 shrink-0"
          >
            <Zap className="h-3 w-3" />
            <span>Fazer Upgrade</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#0F172A] to-[#0A0E1A] p-6 text-center shadow-xl backdrop-blur-md select-none',
        className
      )}
    >
      {/* Luz decorativa suave de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-amber-500/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-[#FFE600] ring-1 ring-amber-500/30 shadow-inner">
          <Lock className="h-6 w-6" />
        </div>

        <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#FFE600]">
          Recurso Exclusivo • Plano {requiredPlan}
        </span>

        <h3 className="text-base sm:text-lg font-black text-white tracking-tight max-w-md">
          {featureName}
        </h3>

        <p className="mt-1.5 max-w-sm text-xs text-slate-400 leading-relaxed">
          Esta funcionalidade foi desenhada para acelerar seus resultados e está liberada a partir do{' '}
          <strong className="text-white">Plano {requiredPlan}</strong>. Faça upgrade para desbloquear instantaneamente.
        </p>

        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 transition active:scale-95"
          >
            <Zap className="h-4 w-4" />
            <span>⚡ Fazer Upgrade para o Plano {requiredPlan}</span>
          </button>
        )}
      </div>
    </div>
  );
}
