import { MessageCircle, Sparkles } from 'lucide-react';
import { useStoreSettings } from '@/lib/store-settings';

interface HeroBannerProps {
  onVip?: () => void;
}

export function HeroBanner({ onVip }: HeroBannerProps) {
  const [settings] = useStoreSettings();
  const generalUrl =
    settings.generalAffiliateUrl ||
    `https://www.mercadolivre.com.br/ofertas?matt_tool=${settings.mlAffiliateTag}`;

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1329] via-[#0F172A] to-[#1E293B] p-4 text-white shadow-xl sm:p-7">
      {/* Luzes decorativas sutis no fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#FFE600]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-[#3483FA]/10 blur-3xl"
      />

      <div className="relative flex flex-col-reverse items-center justify-between gap-5 md:flex-row md:items-center">
        {/* Texto & Chamadas para Ação */}
        <div className="flex-1 text-center md:text-left">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#FFE600]/30 bg-[#FFE600]/10 px-3 py-1 text-[11px] font-bold text-[#FFE600] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curadoria Oficial • Mercado Livre</span>
          </div>

          <h1 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl">
            Achadinhos reais do Mercado Livre escolhidos todo dia pela Clarice
          </h1>

          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Garimpamos descontos de até <strong>70% OFF</strong> com preços verificados, frete grátis e compra 100% garantida no app oficial do Mercado Livre.
          </p>

          {/* Selos de Confiança */}
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-semibold text-slate-200 md:justify-start sm:gap-2">
            <li className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 backdrop-blur-xs">
              <span>⭐</span> Descontos Reais
            </li>
            <li className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 backdrop-blur-xs">
              <span>⚡</span> Envio Rápido FULL
            </li>
            <li className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 backdrop-blur-xs">
              <span>🔒</span> Compra 100% Segura
            </li>
          </ul>

          {/* Ações Rápidas */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <button
              type="button"
              onClick={onVip}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-black text-xs sm:text-sm px-4 py-3 shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
            >
              <MessageCircle className="h-4 w-4 fill-current" />
              <span>Entrar no Grupo VIP WhatsApp</span>
            </button>

            <a
              href="#achadinho-do-dia"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('achadinho-do-dia')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-black text-xs sm:text-sm px-4 py-3 shadow-lg shadow-yellow-500/20 transition transform active:scale-95"
            >
              <span>⭐ Ver Achadinho do Dia</span>
            </a>
          </div>
        </div>

        {/* Mascote Clarice em Destaque na Primeira Dobra */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#FFE600]/30 to-[#3483FA]/20 blur-xl -z-10" />
            <img
              src="/brand/clarice-hero.png"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/brand/logo-square.jpg';
              }}
              alt="Mascote Clarice - Curadora de Achadinhos"
              width={240}
              height={240}
              className="h-36 w-auto sm:h-48 md:h-56 object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FFE600] px-3 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-md">
              Sua Curadora Oficial
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
