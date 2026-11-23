import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Heart, Share2, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { AffiliateProduct } from '@/types/product';
import { buildWhatsAppCopy, formatBRL } from '@/lib/catalog';
import { copyText } from '@/components/store/ProductCard';
import { cn } from '@/lib/utils';

interface DealsCarouselProps {
  carouselId: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  badgeText?: string;
  badgeColor?: string;
  products: AffiliateProduct[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function DealsCarousel({
  carouselId,
  title,
  subtitle,
  icon,
  badgeText,
  badgeColor = 'bg-[#FFE600] text-slate-950',
  products,
  favorites,
  onToggleFavorite,
}: DealsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = scrollContainerRef.current.clientWidth * 0.75;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const handleLinkClick = (isShopee: boolean) => {
    toast.info('Ativando link de apoio...', {
      description: isShopee
        ? 'Redirecionando para o ambiente seguro da Shopee.'
        : 'Redirecionando para o ambiente seguro do Mercado Livre.',
    });
  };

  return (
    <section className="mb-8">
      {/* Cabeçalho da Seção */}
      <div className="mb-3.5 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-500">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                {title}
              </h2>
              {badgeText && (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase shadow-xs', badgeColor)}>
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Botões de Scroll Desktop */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Rolar para esquerda"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-2xs hover:bg-muted hover:text-foreground transition active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Rolar para direita"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-2xs hover:bg-muted hover:text-foreground transition active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carrossel Horizontal */}
      <div
        id={carouselId}
        ref={scrollContainerRef}
        className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-2 pt-1 px-1 snap-x snap-mandatory touch-pan-x"
      >
        {products.map((p) => {
          const isFavorite = favorites.includes(p.id);
          const isShopee = p.marketplace === 'shopee';

          return (
            <article
              key={p.id}
              className="flex w-[185px] sm:w-[220px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition hover:shadow-md hover:-translate-y-1"
            >
              {/* Imagem do Card */}
              <div className="relative aspect-square w-full overflow-hidden border-b border-slate-100 bg-white p-3">
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  width={300}
                  height={300}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/icons/icon-192x192.png';
                  }}
                  className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                />

                <span
                  className={cn(
                    "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-xs",
                    isShopee ? "bg-[#EE4D2D] text-white" : "bg-[#FFE600] text-slate-950"
                  )}
                >
                  {isShopee ? 'Shopee ' : ''}{p.discountPercent}% OFF
                </span>

                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(p.id)}
                    aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 shadow-2xs backdrop-blur-xs transition',
                      isFavorite ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive'
                    )}
                  >
                    <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(buildWhatsAppCopy(p), 'Oferta copiada!')}
                    aria-label="Copiar link"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 shadow-2xs backdrop-blur-xs text-muted-foreground hover:text-emerald-600 transition"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Detalhes do Produto */}
              <div className="flex flex-1 flex-col justify-between p-3">
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold mb-1">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{p.rating.toLocaleString('pt-BR')}</span>
                    <span className="text-muted-foreground font-normal">({p.reviewsCount})</span>
                  </div>

                  <h3 className="line-clamp-2 min-h-[32px] text-xs font-semibold leading-snug text-foreground/90">
                    {p.title}
                  </h3>

                  <p className="mt-1 text-[11px] text-muted-foreground line-through">
                    {formatBRL(p.originalPrice)}
                  </p>
                  <p className="text-sm sm:text-base font-extrabold text-foreground">
                    {formatBRL(p.currentPrice)}
                  </p>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">
                    {p.installmentsText}
                  </p>
                  {p.freeShipping && (
                    <p className="mt-1 text-[10px] font-bold text-emerald-600">
                      Frete grátis {p.isFull && <span className="italic font-extrabold text-amber-600">⚡ FULL</span>}
                    </p>
                  )}
                </div>

                <a
                  href={p.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleLinkClick(isShopee)}
                  className={cn(
                    "mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold shadow-xs active:scale-95 transition",
                    isShopee
                      ? "bg-[#EE4D2D] text-white hover:bg-[#d83f21] shadow-[#EE4D2D]/20"
                      : "bg-ml text-on-brand hover:bg-ml-hover"
                  )}
                >
                  <span>{isShopee ? 'Garantir na Shopee' : 'Garantir Oferta'}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
