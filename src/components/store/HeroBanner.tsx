export function HeroBanner() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-ml-deep via-ml-hover to-ml p-4 text-on-brand shadow-sm sm:p-6">
      <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-promo/25 blur-2xl" />
      <h1 className="relative text-xl font-extrabold tracking-tight sm:text-3xl">Clarice Variedades: Ofertas Selecionadas do Mercado Livre</h1>
      <p className="relative mt-1.5 max-w-2xl text-xs text-on-brand/90 sm:text-sm">
        Garimpamos diariamente os melhores preços e descontos reais em produtos para sua casa, dia a dia e família. Clique na oferta desejada para finalizar sua compra com total segurança direto no site ou app oficial do Mercado Livre.
      </p>
      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <ul className="flex flex-wrap gap-2 text-[11px] font-semibold sm:text-xs">
          {['🔒 Compra Garantida ML', '⚡ Envio Full Rápido', '🏷️ Preços Atualizados Hoje'].map((b) => (
            <li key={b} className="rounded-full bg-on-brand/15 px-2.5 py-1 backdrop-blur-xs">{b}</li>
          ))}
        </ul>
        <a href="https://www.mercadolivre.com.br" target="_blank" rel="noopener noreferrer"
          className="bg-[#FFE600] hover:bg-amber-400 text-slate-900 font-extrabold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm inline-flex items-center gap-2 mt-3">
          🚀 Vai comprar outro produto? Abrir Mercado Livre
        </a>
      </div>
    </section>
  );
}
