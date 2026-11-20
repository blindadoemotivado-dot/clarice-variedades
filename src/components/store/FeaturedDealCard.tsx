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
  const handleLinkClick = () => {
    toast.info('Ativando link de apoio...', {
      description: 'Redirecionando para o ambiente seguro do Mercado Livre.',
    });
  };

  const savings = Math.max(0, p.originalPrice - p.currentPrice);

  return (
    <section id="achadinho-do-dia" className="relative mb-8 scroll-mt-24">
      {/* Glow de fundo */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-400/30 via-yellow-400/20 to-blue-500/20 blur-xl opacity-75 -z-10" />

      <div className="overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-card via-card to-amber-500/5 p-4 shadow-xl sm:p-6">
        {/* Barra de destaque superior */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-sm">
              ⭐
            </span>
            <div>
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                Curadoria Especial
              </span>
              <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
                Achadinho do Dia
              </h2>
            </div>
          </div>

          {savings > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/20">
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

            <span className="absolute left-3 top-3 rounded-xl bg-[#FFE600] px-2.5 py-1 text-xs font-black uppercase text-slate-950 shadow-md">
              {p.discountPercent}% OFF
            </span>

            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onToggleFavorite(p.id)}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={isFavorite}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur-xs transition-colors',
                  isFavorite ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive'
                )}
              >
                <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
              </button>

              <button
                type="button"
                onClick={() => copyText(buildWhatsAppCopy(p), 'Oferta copiada para WhatsApp!')}
                aria-label="Copiar oferta para WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur-xs text-muted-foreground hover:text-emerald-600 transition-colors"
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
                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {p.rating.toLocaleString('pt-BR')} ({p.reviewsCount.toLocaleString('pt-BR')} avaliações)
                </span>
              </div>

              <h3 className="text-base font-bold text-foreground sm:text-xl leading-snug">
                {p.title}
              </h3>

              {/* Preços */}
              <div className="mt-3 rounded-2xl bg-muted/40 p-3 sm:p-4 border border-border/60">
                <p className="text-xs text-muted-foreground line-through">
                  De: {formatBRL(p.originalPrice)}
                </p>
                <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    {formatBRL(p.currentPrice)}
                  </span>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-xs font-extrabold text-emerald-600">
                    {p.discountPercent}% de desconto
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  💳 {p.installmentsText}
                </p>
                {p.freeShipping && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    Frete grátis para todo o Brasil {p.isFull && <span className="italic font-black text-amber-600">⚡ FULL</span>}
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
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 active:bg-yellow-500 text-slate-950 font-black text-sm px-5 py-3.5 shadow-lg shadow-yellow-500/20 transition transform active:scale-[0.98]"
              >
                <span>Garantir Oferta no Mercado Livre</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>

              <button
                type="button"
                onClick={() => copyText(buildWhatsAppCopy(p), 'Texto copiado para envio no WhatsApp!')}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs sm:text-sm px-4 py-3 transition"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>Copiar p/ WhatsApp</span>
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-muted-foreground/80 md:text-left">
              🔒 Redirecionado com segurança para o ambiente oficial do Mercado Livre
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
