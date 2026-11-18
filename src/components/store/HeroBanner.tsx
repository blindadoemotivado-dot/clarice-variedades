export function HeroBanner() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-ml-deep via-ml-hover to-ml p-4 text-on-brand shadow-sm sm:p-6">
      <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-promo/25 blur-2xl" />
      <h1 className="relative text-xl font-extrabold tracking-tight sm:text-3xl">Clarice Variedades: Cada Compra no Mercado Livre Constrói o Futuro da Minha Filha</h1>
      <p className="relative mt-1.5 max-w-2xl text-xs text-on-brand/90 sm:text-sm">
        Esta loja nasceu com o nome da minha filha Clarice, de 8 meses, e em homenagem à memória da mãe dela, tão querida por todos nós. Não importa o que você precise comprar no Mercado Livre hoje: ao iniciar sua compra pelos nossos links ou pedir seu link no WhatsApp, você paga o mesmo preço oficial e gera a comissão que me ajuda a criar a Clarice.
      </p>
      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <ul className="flex flex-wrap gap-2 text-[11px] font-semibold sm:text-xs">
          {['🔒 Compra Garantida ML', '⚡ Envio Full Rápido', '🏷️ Preços Atualizados Hoje'].map((b) => (
            <li key={b} className="rounded-full bg-on-brand/15 px-2.5 py-1 backdrop-blur-xs">{b}</li>
          ))}
        </ul>
        <a href="https://www.mercadolivre.com.br" target="_blank" rel="noopener noreferrer"
          className="bg-[#FFE600] hover:bg-amber-400 text-slate-900 font-extrabold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm inline-flex items-center gap-2 mt-3">
          🚀 Vai comprar outra coisa? Abrir Mercado Livre c/ Apoio Ativo
        </a>
      </div>
    </section>
  );
}
