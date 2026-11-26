import { ExternalLink, Heart, MessageCircle, Share2, Sparkles, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { AffiliateProduct } from '@/types/product';
import { buildWhatsAppCopy, formatBRL } from '@/lib/catalog';
import { copyText } from '@/components/store/ProductCard';
import { cn } from '@/lib/utils';

interface FeaturedDealCardProps {
  product: AffiliateProduct;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export function FeaturedDealCard({ product: p, isFavorite, onToggleFavorite }: FeaturedDealCardProps) {
  const isShopee = p.marketplace === 'shopee';

  const handleLinkClick = () => {
    toast.info('Ativando link de apoio...', {
      description: isShopee
        ? 'Redirecionando para o ambiente seguro da Shopee.'
        : 'Redirecionando para o ambiente seguro do Mercado Livre.',
    });
  };

  const savings = Math.max(0, p.originalPrice - p.currentPrice);

  return (
    <section id="achadinho-do-dia" className="relative mb-8 scroll-mt-24">
      {/* Glow de fundo */}
      <div
        className={cn(
          "absolute -inset-1 rounded-3xl blur-xl opacity-75 -z-10",
          isShopee
            ? "bg-gradient-to-r from-orange-500/30 via-red-500/20 to-amber-500/20"
            : "bg-gradient-to-r from-amber-400/30 via-yellow-400/20 to-blue-500/20"
        )}
      />

      <div
        className={cn(
          "overflow-hidden rounded-3xl border-2 p-4 shadow-xl sm:p-6",
          isShopee
            ? "border-orange-500/60 bg-gradient-to-b from-card via-card to-orange-500/5"
            : "border-amber-400/60 bg-gradient-to-b from-card via-card to-amber-500/5"
        )}
      >
        {/* Barra de destaque superior */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full font-black text-xs shadow-sm",
                isShopee ? "bg-[#EE4D2D] text-white" : "bg-yellow-400 text-slate-950"
              )}
            >
              {isShopee ? '🛍️' : '⭐'}
            </span>
            <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
              Achadinho do Dia
            </h2>
          </div>

          {savings > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Você economiza {formatBRL(savings)}</span>
            </div>
          )}
        </div>

        {/* Conteúdo principal: Imagem + Informações */}
        <div className="grid gap-5 md:grid-cols-12 md:items-center">
          {/* Imagem do Produto com Badges */}
          <div className="relative md:col-span-5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-4 border border-border/70 shadow-inner group">
            <img
              src={p.imageUrl}
              alt={p.title}
              width={600}
              height={600}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/icons/icon-192x192.png';
              }}
              className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
            />

            <div className="absolute left-3 top-3 flex items-center gap-1">
              {p.discountPercent > 0 && (
                <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black uppercase text-white shadow-md">
                  -{p.discountPercent}%
                </span>
              )}
            </div>

            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              {isShopee ? (
                <span className="rounded-md bg-[#EE4D2D] px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs">
                  Shopee
                </span>
              ) : (
                <span className="rounded-md bg-[#FFE600] px-2 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-xs">
                  ML
                </span>
              )}

              <button
                type="button"
                onClick={() => onToggleFavorite(p.id)}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={isFavorite}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur-xs transition-colors',
                  isFavorite ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive'
                )}
              >
                <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
              </button>

              <button
                type="button"
                onClick={() => copyText(buildWhatsAppCopy(p), 'Oferta copiada para WhatsApp!')}
                aria-label="Copiar oferta para WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur-xs text-muted-foreground hover:text-emerald-500 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Dados & Preço */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {p.category}
                </span>
                {p.rating > 0 && p.reviewsCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {p.rating.toLocaleString('pt-BR')} ({p.reviewsCount.toLocaleString('pt-BR')} avaliações)
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-foreground sm:text-xl leading-snug">
                {p.title}
              </h3>

              {/* Preços */}
              <div className="mt-3 rounded-2xl bg-muted/40 p-3 sm:p-4 border border-border/60">
                {p.originalPrice > p.currentPrice && (
                  <p className="text-xs text-muted-foreground line-through">
                    De: {formatBRL(p.originalPrice)}
                  </p>
                )}
                <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    {formatBRL(p.currentPrice)}
                  </span>
                </div>
                {p.installmentsText && (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    💳 {p.installmentsText}
                  </p>
                )}
                {p.freeShipping && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-500">
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    Frete grátis {p.isFull && <span className="italic font-black text-amber-500">⚡ FULL</span>}
                  </p>
                )}
              </div>
            </div>

            {/* CTAs de Ação */}
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={p.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className="flex-1 flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-slate-950 font-extrabold text-sm shadow-md transition transform active:scale-[0.98]"
              >
                <span>Ver oferta</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>

              <button
                type="button"
                onClick={() => copyText(buildWhatsAppCopy(p), 'Texto copiado para envio no WhatsApp!')}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs sm:text-sm px-4 py-2.5 transition cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <span>Copiar p/ WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
