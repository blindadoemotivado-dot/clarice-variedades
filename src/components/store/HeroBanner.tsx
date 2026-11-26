import { MessageCircle, Sparkles } from 'lucide-react';
import { useStoreSettings } from '@/lib/store-settings';

interface HeroBannerProps {
  onVip?: () => void;
  storeName?: string;
  mascoteUrl?: string;
  bannerUrl?: string;
  vipUrl?: string;
  accentColor?: string;
  storeSlug?: string;
  subtitle?: string;
}

export function HeroBanner({
  onVip,
  storeName = 'Clarice Achadinhos',
  mascoteUrl,
  bannerUrl,
  vipUrl,
  accentColor,
  storeSlug = 'clarice',
  subtitle,
}: HeroBannerProps) {
  const [settings] = useStoreSettings();
  const generalUrl =
    settings.generalAffiliateUrl ||
    `https://www.mercadolivre.com.br/ofertas?matt_tool=${settings.mlAffiliateTag}`;

  const isClarice = (storeSlug || '').toLowerCase() === 'clarice' || storeName === 'Clarice Achadinhos';
  const customImage = (mascoteUrl && mascoteUrl.trim() !== '') ? mascoteUrl.trim() : (bannerUrl && bannerUrl.trim() !== '') ? bannerUrl.trim() : '';
  const hasCustomImage = Boolean(customImage);
  const showMascot = hasCustomImage || isClarice;
  const resolvedMascote = hasCustomImage ? customImage : isClarice ? '/brand/clarice-hero.png' : undefined;
  const effectiveAccent = accentColor || '#FFE600';

  const handleVipClick = () => {
    if (onVip) {
      onVip();
      return;
    }
    if (vipUrl) {
      window.open(vipUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className={`relative mb-6 overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1329] via-[#0F172A] to-[#1E293B] px-4 pt-5 ${showMascot ? 'pb-0' : 'pb-6 sm:pb-8'} text-white shadow-xl sm:px-7 sm:pt-7 ${showMascot ? 'md:min-h-[380px] lg:min-h-[420px]' : 'min-h-[260px]'} flex flex-col justify-end`}>
      {/* Luzes decorativas sutis no fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: effectiveAccent }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -bottom-12 h-72 w-72 rounded-full bg-[#3483FA]/10 blur-3xl"
      />

      <div className={`relative flex flex-col-reverse items-center justify-between gap-5 ${showMascot ? 'md:flex-row md:items-end' : 'md:flex-row md:items-center'} w-full`}>
        {/* Texto & Chamadas para Ação */}
        <div className={`flex-1 text-center md:text-left py-2 ${showMascot ? 'pb-6 md:pb-8' : 'pb-2'} ${!showMascot ? 'max-w-3xl' : ''}`}>
          <h1 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl max-w-2xl break-words min-w-0">
            {isClarice
              ? 'Achadinhos reais com desconto todo dia'
              : `Achadinhos com desconto por ${storeName}`}
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm max-w-xl break-words min-w-0">
            {subtitle || 'Ofertas verificadas no Mercado Livre e Shopee para você economizar com compra 100% segura.'}
          </p>

          {/* Ações Rápidas Enxutas */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <button
              type="button"
              onClick={handleVipClick}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-black text-xs sm:text-sm px-4 py-3 shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 fill-current shrink-0" />
              <span>Entrar no Grupo VIP WhatsApp</span>
            </button>

            <a
              href="#achadinho-do-dia"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('achadinho-do-dia')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm px-4 py-3 shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <span>⭐ Ver Achadinho do Dia</span>
            </a>
          </div>
        </div>

        {/* Mascote / Imagem de Destaque da Loja */}
        {showMascot && resolvedMascote && (
          <div className="relative shrink-0 flex items-end justify-center md:justify-end self-center md:self-end">
            <div className="relative flex items-end justify-center">
              <div
                className="absolute -inset-3 rounded-full blur-2xl -z-10 opacity-30"
                style={{ background: `radial-gradient(circle, ${effectiveAccent} 0%, #3483FA 100%)` }}
              />
              <img
                src={resolvedMascote}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  if (isClarice) {
                    e.currentTarget.src = '/brand/clarice-hero.png';
                  } else {
                    e.currentTarget.style.display = 'none';
                  }
                }}
                alt={storeName}
                width={340}
                height={380}
                className={
                  isClarice
                    ? "h-44 sm:h-56 md:h-[300px] lg:h-[340px] w-auto object-contain object-bottom drop-shadow-2xl transition-transform duration-300 hover:scale-[1.02]"
                    : "max-h-48 sm:max-h-56 md:max-h-[290px] lg:max-h-[320px] max-w-xs sm:max-w-sm md:max-w-md w-auto rounded-2xl object-contain object-bottom drop-shadow-2xl transition-transform duration-300 hover:scale-[1.02]"
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
