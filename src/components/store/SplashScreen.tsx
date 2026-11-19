import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [shouldRender, setShouldRender] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Evita repetição na mesma sessão (navegações internas e recargas)
    try {
      const seen = sessionStorage.getItem('clarice_splash_seen');
      if (seen) return;

      sessionStorage.setItem('clarice_splash_seen', 'true');
      setShouldRender(true);

      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, 900);

      const removeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 1200);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    } catch (_) {
      // Se cookies/storage estiverem bloqueados, não trava a tela
    }
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] px-4 transition-opacity duration-300 ease-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-400">
        <div className="relative">
          <img
            src="/icons/icon-512x512.png"
            alt="Clarice Achadinhos"
            className="h-28 w-28 rounded-3xl object-cover ring-2 ring-[#FFE600] shadow-2xl bg-[#131d36]"
          />
          <div className="absolute -inset-1 rounded-3xl bg-[#FFE600]/20 blur-md -z-10" />
        </div>

        <h1 className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl">
          Clarice Achadinhos
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          Curadoria oficial • Mercado Livre
        </p>

        {/* Barra de carregamento suave */}
        <div className="mt-7 h-1 w-36 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-full bg-[#FFE600] animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
