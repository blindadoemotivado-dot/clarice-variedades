import { ExternalLink, Heart, Share2, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { AffiliateProduct } from '@/types/product';
import { buildWhatsAppCopy, formatBRL } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export interface ProductCardProps { product: AffiliateProduct; isFavorite: boolean; onToggleFavorite: (id: string) => void }

export async function copyText(text: string, success: string) {
  try { await navigator.clipboard.writeText(text); toast.success(success); } catch { toast.error('Não foi possível copiar. Tente novamente.'); }
}

const floatBtn = 'flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 shadow-2xs backdrop-blur-xs transition-colors';

export function ProductCard({ product: p, isFavorite, onToggleFavorite }: ProductCardProps) {
  const open = () => {
    toast.info('Ativando link de apoio...', { description: 'Redirecionando para o ambiente seguro do ML.' });
    window.open(p.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  const analysisPoints = [
    `${p.discountPercent}% de desconto sobre o preço original`,
    p.freeShipping ? 'Frete grátis informado na oferta' : 'Confira o valor final do frete',
    `Nota ${p.rating.toLocaleString('pt-BR')} com ${p.reviewsCount.toLocaleString('pt-BR')} avaliações`,
  ];

  return (
    <motion.article layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }} whileHover={{ y: -4 }}
      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-lg">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-white p-4 group">
        <img
          src={p.imageUrl}
          alt={p.title}
          loading="lazy"
          width={600}
          height={600}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/icon-192.png';
          }}
          className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
        />
        {p.badgeText && <span className="absolute left-2 top-2 rounded-md bg-badge px-2 py-0.5 text-[10px] font-extrabold uppercase text-on-brand shadow-2xs">{p.badgeText}</span>}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button type="button" onClick={() => onToggleFavorite(p.id)} aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={isFavorite} className={cn(floatBtn, isFavorite ? 'text-destructive' : 'text-muted-foreground hover:text-destructive')}>
            <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
          </button>
          <button type="button" onClick={() => copyText(buildWhatsAppCopy(p), 'Copiado com sucesso!')} aria-label="Copiar oferta para WhatsApp" className={cn(floatBtn, 'text-muted-foreground hover:bg-deal-soft hover:text-deal')}>
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3.5">
        <div>
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-star text-star" />{p.rating.toLocaleString('pt-BR')} ({p.reviewsCount.toLocaleString('pt-BR')})</span>
            <span className="hidden truncate sm:inline">{p.mlbId}</span>
          </div>
          <h3 className="my-1 line-clamp-2 min-h-[36px] text-xs font-medium leading-snug text-foreground/80 sm:min-h-[40px] sm:text-sm">{p.title}</h3>
          <p className="text-[11px] text-muted-foreground line-through sm:text-xs">{formatBRL(p.originalPrice)}</p>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-foreground sm:text-xl">{formatBRL(p.currentPrice)}</span>
            <span className="rounded bg-deal-soft px-1.5 py-0.5 text-[10px] font-extrabold text-deal sm:text-xs">{p.discountPercent}% OFF</span>
          </div>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{p.installmentsText}</p>
          {p.freeShipping && <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-deal">Frete grátis {p.isFull && <span className="italic text-deal">⚡ FULL</span>}</p>}
        </div>
        <div className="mt-2.5 border-t border-border/60 pt-2">
          <details className="group/analysis mb-2 rounded-xl bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-[#2968C8] hover:underline">
              <Sparkles className="h-3.5 w-3.5" /> Vale a pena?
            </summary>
            <ul className="mt-2 space-y-1.5 border-t border-border/70 pt-2 leading-relaxed">
              {analysisPoints.map((point) => <li key={point} className="flex gap-1.5"><span className="text-[#3483FA]">•</span><span>{point}</span></li>)}
            </ul>
            <button type="button" onClick={open} className="mt-2.5 inline-flex items-center gap-1 font-semibold text-[#2968C8] hover:underline">Garantir Oferta no ML <ExternalLink className="h-3 w-3" /></button>
          </details>
          <button type="button" onClick={open} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-ml px-3 py-2 text-xs font-bold text-on-brand shadow-xs transition-all hover:bg-ml-hover active:scale-[0.98] sm:py-2.5 sm:text-sm">
            Garantir Oferta no ML <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/80 leading-tight">
            Direcionado com segurança para o ambiente oficial do Mercado Livre
          </p>
        </div>
      </div>
    </motion.article>
  );
}
