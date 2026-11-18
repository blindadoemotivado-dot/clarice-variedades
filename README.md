# Clarice Variedades

[SYSTEM DIRECTIVE: ZERO-SHOT FRONTEND EXECUTION — LOVABLE AI]
ROLE: Principal UI/UX Retail Architect & Senior React Engineer.
PROJECT: "Zizi Variedades" — High-Conversion Affiliate Retail Storefront & Admin Bulk Ingestor.
EXECUTION MODE: Single-pass, 100% functional frontend with stateful local persistence (localStorage fallback to rich Mock Data). Zero backend calls, zero routing hallucinations.

1. STRICT TECH STACK & ANTI-HALLUCINATION CONSTRAINTS
- MANDATORY: React 19 (Vite), TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, Sonner (toasts).
- STRICTLY PROHIBITED: Next.js, next/link, next/image, next/navigation, App Router, SSR, Supabase client initialization, or external API calls that could fail CORS.
- IMAGE POLICY: NEVER use `source.unsplash.com` (deprecated). Use strictly hardcoded, high-availability Unsplash CDN URLs (`https://images.unsplash.com/photo-...` with `?auto=format&fit=crop&w=600&q=80`).
- CURRENCY FORMATTING: Format all prices strictly with `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)`.

2. DUAL-ECOSYSTEM DESIGN SYSTEM
A. PUBLIC STOREFRONT (Retail High-Trust Light Mode — Optimized for Conversion)
- Canvas Background: `bg-[#F8FAFC]` (Slate-50) for clean retail contrast and zero visual fatigue.
- Product Card Surface: `bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden`.
- Retail Color Tokens:
  * Top Promo Strip & Highlights: Retail Yellow (`bg-[#FFE600] text-slate-900 font-bold`).
  * Primary Checkout CTA: High-Trust Marketplace Blue (`bg-[#3483FA] hover:bg-[#2968C8] text-white font-semibold shadow-sm active:scale-[0.98]`).
  * WhatsApp Action CTA: Conversion Green (`bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold`).
  * Discount & Shipping Accents: `text-[#00A650] bg-emerald-50 border border-emerald-200/60 font-bold`.
- Typography Hierarchy:
  * Product Title: `text-slate-700 text-xs sm:text-sm font-medium line-clamp-2 min-h-[36px] sm:min-h-[40px] leading-snug`.
  * Current Price: `text-slate-900 text-lg sm:text-2xl font-extrabold tracking-tight`.
  * Original Price: `text-slate-400 text-[11px] sm:text-xs line-through`.

B. ADMIN DRAWER / MODAL (FCIA Backstage — Dark Mode)
- Triggered via a discreet lock button ("Painel Zizi") in the footer.
- Surface: `bg-zinc-950 text-zinc-100 border-l border-white/10`.
- Inputs & Panels: `bg-zinc-900 border-white/10 text-zinc-100 placeholder:text-zinc-500`.
- Primary Admin Accent: `bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold`.

3. STRICT TYPESCRIPT DATA CONTRACT & INITIAL MOCK DATA
Create `src/types/product.ts` and `src/data/mockProducts.ts` using this exact structure:

export type ProductCategory = 'Todos' | 'Casa & Cozinha' | 'Eletroportáteis' | 'Eletrônicos' | 'Ferramentas' | 'Beleza & Saúde';

export interface AffiliateProduct {
  id: string;
  mlbId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  installmentsText: string;
  imageUrl: string;
  affiliateUrl: string;
  category: Exclude<ProductCategory, 'Todos'>;
  badgeText?: 'Oferta Relâmpago' | 'Mais Vendido' | 'Menor Preço';
  freeShipping: boolean;
  isFull: boolean;
  rating: number;
  reviewsCount: number;
  featured: boolean;
}

Populate initial state with 8 ultra-realistic Brazilian retail products:
1. Fritadeira Elétrica Air Fryer Mondial Family IV 4L Preta/Inox (MLB-3491827, R$ 429,90 -> R$ 279,90, 35% OFF, 6x sem juros, Casa & Cozinha, Mais Vendido, photo: `https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80`)
2. Smart TV 50" Crystal UHD 4K Samsung 50DU8000 Painel Dynamic (MLB-9928172, R$ 3199,00 -> R$ 2249,00, 30% OFF, 10x sem juros, Eletrônicos, Oferta Relâmpago, photo: `https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80`)
3. Jogo de Panelas Tramontina Turim 10 Peças Alumínio Antiaderente Starflon (MLB-1182934, R$ 549,90 -> R$ 349,90, 36% OFF, 7x sem juros, Casa & Cozinha, Mais Vendido, photo: `https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?auto=format&fit=crop&w=600&q=80`)
4. Liquidificador Oster OLIQ610 1400W Full Jarra 3,2L 15 Velocidades (MLB-7748291, R$ 319,00 -> R$ 199,90, 37% OFF, 4x sem juros, Eletroportáteis, Menor Preço, photo: `https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80`)
5. Smartphone Motorola Moto G84 5G 256GB 16GB RAM Boost Câmera 50MP (MLB-5561928, R$ 1899,00 -> R$ 1349,00, 29% OFF, 10x sem juros, Eletrônicos, Oferta Relâmpago, photo: `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80`)
6. Aspirador de Pó Robô Inteligente 3 em 1 Passa Pano Recarregável Bivolt (MLB-6629104, R$ 699,00 -> R$ 389,90, 44% OFF, 8x sem juros, Eletroportáteis, Mais Vendido, photo: `https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=600&q=80`)
7. Parafusadeira e Furadeira de Impacto Bosch GSB 180-LI 18V com Maleta (MLB-8837162, R$ 899,00 -> R$ 589,00, 34% OFF, 10x sem juros, Ferramentas, Menor Preço, photo: `https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80`)
8. Secador de Cabelos Profissional Taiff Tourmaline Íon Cerâmica 2100W (MLB-4419283, R$ 459,00 -> R$ 289,90, 37% OFF, 6x sem juros, Beleza & Saúde, Mais Vendido, photo: `https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=600&q=80`)

4. UI BLUEPRINT & INTERACTIVE UX FLOWS

A. TOP TRUST HEADER (Sticky `top-0 z-40`)
- Announcement Strip: `bg-[#FFE600] text-slate-900 text-[11px] sm:text-xs font-semibold py-1.5 px-3 text-center flex items-center justify-center gap-1.5` -> "⚡ Curadoria Oficial Zizi Variedades • Redirecionamento 100% Seguro para o Mercado Livre".
- Main Navigation Bar (`bg-white border-b border-slate-200 py-3 px-4 shadow-2xs`):
  * Brand Logo: ShoppingBag icon inside a rounded yellow/blue badge + "Zizi Variedades" (`font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight`) + Verified Badge (`BadgeCheck` in `#3483FA`).
  * Instant Search Input: Rounded pill (`rounded-full bg-slate-100 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#3483FA] pl-9 pr-8 h-10 text-sm`) with clear (`X`) button, filtering products in real time by title or MLB ID.
  * Right Actions:
    1. Favorites Counter Button (`Heart` icon + numeric badge) toggling a "Meus Favoritos" filter view.
    2. "Grupo VIP WhatsApp" CTA button (`bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-xs`).

B. CONVERSION HERO BANNER & TRUST BAR
- Compact Hero (`rounded-2xl bg-gradient-to-r from-[#1E40AF] via-[#2968C8] to-[#3483FA] text-white p-4 sm:p-6 mb-5 shadow-sm relative overflow-hidden`):
  * Headline: "Achadinhos do Dia com Desconto Verificado"
  * Subheadline: "Nós garimpamos os menores preços. Você clica na oferta e finaliza sua compra direto no aplicativo oficial do Mercado Livre com garantia total."
  * Trust Micro-Badges Row: "🔒 Compra Garantida ML", "⚡ Envio Full Rápido", "🏷️ Preços Atualizados Hoje".

C. HORIZONTAL CATEGORY PILLS & SORTING BAR
- Scrollable category bar (`flex items-center gap-2 overflow-x-auto no-scrollbar pb-2`) for all `ProductCategory` items + a special `"🔥 Ofertas Relâmpago"` filter.
- Sort Control: Select dropdown ("Mais Relevantes", "Menor Preço", "Maior Desconto %").

D. MOBILE-FIRST 2-COLUMN PRODUCT GRID
- Grid Container: `grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5`.
- CRITICAL MOBILE UX: Must strictly render 2 columns side-by-side on mobile (`375px+`) to match Mercado Livre / Shopee native browsing density.
- Product Card Structure:
  1. Image Header (`relative aspect-square bg-white p-2.5 sm:p-4 border-b border-slate-100 flex items-center justify-center group`):
     - Product image (`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300`).
     - Top-Left Badge (`if badgeText`): Pill badge (`bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-2xs`).
     - Top-Right Floating Actions (`flex flex-col gap-1.5`):
       * Favorite Heart toggle (`w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center shadow-2xs`).
       * WhatsApp Quick Share button (`Share2` icon, `w-7 h-7 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600`): Clicking copies a ready-to-send formatted WhatsApp offer message (`"🔥 *ACHADINHO ZIZI VARIEDADES*\n\n🛍️ *{title}*\n~De: {originalPrice}~\n✅ *Por apenas: {currentPrice}* ({discountPercent}% OFF)\n💳 {installmentsText}\n\n👉 *Compre no Mercado Livre pelo link oficial:* {affiliateUrl}"`) to clipboard and fires a Sonner toast.
  2. Card Body (`p-2.5 sm:p-3.5 flex flex-col flex-1 justify-between`):
     - Rating & MLB code row: Star icon (`fill-amber-400 text-amber-400 w-3 h-3`) + `{rating} ({reviewsCount})` in `text-[11px] text-slate-400`.
     - Title: `text-xs sm:text-sm text-slate-700 font-medium line-clamp-2 my-1`.
     - Pricing Block:
       * Original price strike-through (`text-[11px] text-slate-400 line-through`).
       * Price Row (`flex items-baseline gap-1.5 flex-wrap`): Current Price (`text-base sm:text-xl font-extrabold text-slate-900`) + Discount Tag (`text-[10px] sm:text-xs font-extrabold text-[#00A650] bg-emerald-50 px-1.5 py-0.5 rounded`).
       * Installments (`text-[11px] text-slate-500 line-clamp-1`).
     - Shipping Row: `if (freeShipping)` render `"Frete grátis"` in `text-[11px] font-bold text-[#00A650]` alongside an italic `"⚡ FULL"` badge if `isFull === true`.
  3. Card Footer CTA (`mt-2.5 pt-2 border-t border-slate-100`):
     - Primary Redirect Button (`w-full bg-[#3483FA] hover:bg-[#2968C8] text-white font-bold text-xs sm:text-sm py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all`):
       * Label: `"Ver no Mercado Livre"` + `ExternalLink` icon (`w-3.5 h-3.5`).
       * Action: Opens `affiliateUrl` in a new tab (`window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer')`) and triggers a confirmation toast (`"Cupom e link ativados! Redirecionando para o Mercado Livre..."`).

E. FLOATING WHATSAPP CONCIERGE & FOOTER
- Floating bottom-right button (`fixed bottom-5 right-5 z-30 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-full p-3.5 shadow-lg flex items-center gap-2`): Opens a clean helper modal where customers can type what product they are looking for ("Procurando algo específico? Peça o link com desconto para a Zizi no WhatsApp!").
- Footer: Trust disclaimer explaining Zizi Variedades is an official affiliate curator, plus a discreet button `"🔒 Painel Zizi (Admin)"` that opens the Dark Mode Admin Sheet.

F. ADMIN SHEET: "INPUT MÁGICO & PROCESSADOR EM LOTE" (Dark Mode `Sheet` or `Dialog`)
- Styled strictly in FCIA Dark Mode (`bg-zinc-950 text-zinc-100 border-white/10`).
- Contains 3 functional Tabs:
  1. Tab "Input Mágico (1-Click)":
     - Input field to paste a single Mercado Livre URL + Affiliate Link + Category selector + "Otimizar título com IA" Switch.
     - Button `"Puxar Dados do ML e Publicar"`: Simulates extracting the `MLB-XXXXXXX` code from the pasted URL, populates preview fields (Title, Price, Image URL), and inserts the new item at the top of the storefront state (`localStorage`).
  2. Tab "Processador em Lote (Bulk)":
     - Large `<Textarea>` accepting multiple Mercado Livre URLs (one per line).
     - Default category selector.
     - Button `"Processar Lote Instantâneo"` (`bg-cyan-500 text-zinc-950 font-bold w-full`): Parses every non-empty line, generates structured `AffiliateProduct` entries with extracted MLB IDs, prepends them to the live catalog with a `framer-motion` animation, and displays a toast (`"X produtos importados para a vitrine com sucesso!"`).
  3. Tab "Gerador de Disparo WhatsApp & Gestão":
     - List of all active products in the storefront with a one-click `"Copiar Copy de Venda"` button (copies formatted WhatsApp broadcast text), a `"Destaque"` toggle, and a `"Remover"` (`Trash2`) button with a `"Restaurar Catálogo Padrão"` reset action.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c9e58c3-240e-4051-884d-e73c909bf5e0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
