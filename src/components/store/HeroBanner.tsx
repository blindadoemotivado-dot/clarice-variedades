import { MessageCircle } from 'lucide-react';
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

  const isClarice = (storeSlug || '').toLowerCase() === 'clarice' || storeName === 'Clarice Achadinhos';
  const customImage = (mascoteUrl && mascoteUrl.trim() !== '') ? mascoteUrl.trim() : (bannerUrl && bannerUrl.trim() !== '') ? bannerUrl.trim() : '';
  const resolvedMascote = customImage || (isClarice ? '/brand/avatar-circular.png' : undefined);
  const effectiveAccent = accentColor || '#FFE600';

  const handleVipClick = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
    } catch {}
    if (onVip) {
      onVip();
      return;
    }
    if (vipUrl) {
      window.open(vipUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="relative mb-4 overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-r from-[#0B1329] via-[#0F172A] to-[#1E293B] p-3 sm:p-4 text-white shadow-md">
      {/* Luz decorativa sutil no fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-15 blur-2xl"
        style={{ backgroundColor: effectiveAccent }}
      />

      <div className="relative flex items-center justify-between gap-3">
        {/* Avatar / Mascote à Esquerda */}
        <div className="relative shrink-0">
          <img
            src={resolvedMascote || '/icons/icon-192x192.png'}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/icons/icon-192x192.png';
            }}
            alt={storeName}
            width={52}
            height={52}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover ring-2 ring-yellow-400/50 shadow-sm bg-slate-900 shrink-0"
          />
        </div>

        {/* Título Curto e Subtítulo Central */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-white truncate leading-tight">
            {isClarice ? 'Achadinhos reais com desconto todo dia' : `Achadinhos por ${storeName}`}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5 leading-snug">
            {subtitle || 'Ofertas verificadas no Mercado Livre e Shopee com compra 100% segura'}
          </p>
        </div>

        {/* Pílula Grupo VIP WhatsApp à Direita */}
        <button
          type="button"
          onClick={handleVipClick}
          className="flex items-center gap-1.5 rounded-full bg-[#25D366] hover:bg-[#20BD5A] active:bg-[#1DA851] text-slate-950 font-black text-xs px-3 py-2 sm:px-4 sm:py-2.5 shadow-md shrink-0 active:scale-95 transition cursor-pointer"
        >
          <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current shrink-0" />
          <span className="hidden xs:inline sm:inline">Grupo VIP</span>
          <span className="xs:hidden sm:hidden">VIP</span>
        </button>
      </div>
    </section>
  );
}
