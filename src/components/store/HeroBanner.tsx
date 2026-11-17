export function HeroBanner() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-ml-deep via-ml-hover to-ml p-4 text-on-brand shadow-sm sm:p-6">
      <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-promo/25 blur-2xl" />
      <h1 className="relative text-xl font-extrabold tracking-tight sm:text-3xl">Achadinhos do Dia com Desconto Verificado</h1>
      <p className="relative mt-1.5 max-w-2xl text-xs text-on-brand/90 sm:text-sm">
        Nós garimpamos os menores preços. Você clica na oferta e finaliza sua compra direto no aplicativo oficial do Mercado Livre com garantia total.
      </p>
      <ul className="relative mt-3 flex flex-wrap gap-2 text-[11px] font-semibold sm:text-xs">
        {['🔒 Compra Garantida ML', '⚡ Envio Full Rápido', '🏷️ Preços Atualizados Hoje'].map((b) => (
          <li key={b} className="rounded-full bg-on-brand/15 px-2.5 py-1 backdrop-blur-xs">{b}</li>
        ))}
      </ul>
    </section>
  );
}
