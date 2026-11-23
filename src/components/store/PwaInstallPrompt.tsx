import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Verifica se já está instalado e rodando em modo PWA standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Verifica se foi dispensado recentemente (últimos 7 dias)
    const lastDismissed = localStorage.getItem('clarice_pwa_prompt_dismissed');
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    setDismissed(false);

    // Detecção de iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    setIsIos(isAppleDevice);

    // Detecção de evento de instalação no Android/Chrome/Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('clarice_pwa_prompt_dismissed', Date.now().toString());
  };

  const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  const search = location?.search || (typeof window !== 'undefined' ? window.location.search : '');
  const searchParams = new URLSearchParams(search);
  const lojaParam = searchParams.get('loja')?.trim().toLowerCase();
  const isSaaSVitrine = Boolean(lojaParam && lojaParam !== 'clarice');
  const isHiddenRoute = pathname.startsWith('/criar-loja') || pathname.startsWith('/admin');

  if (isStandalone || dismissed || isHiddenRoute || isSaaSVitrine) return null;

  // Banner para Android / Desktop (Chrome / Edge)
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-6 md:left-auto md:right-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#0F172A]/95 p-3.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <img
            src="/icons/icon-192x192.png"
            alt="Clarice Achadinhos"
            className="h-11 w-11 rounded-xl object-cover ring-2 ring-[#FFE600] shadow-sm bg-[#131d36]"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white">Instalar Clarice Achadinhos</h4>
            <p className="text-[11px] text-slate-300">Acesse ofertas e favoritos com 1 toque</p>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 rounded-xl bg-[#FFE600] px-3.5 py-2 text-xs font-black text-slate-950 shadow-md hover:bg-yellow-400 active:scale-95 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar aviso"
            className="rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Guia de instalação para iOS (Safari)
  if (isIos) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-6 md:left-auto md:right-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#0F172A]/95 p-3.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <img
            src="/icons/apple-touch-icon.png"
            alt="Clarice Achadinhos"
            className="h-11 w-11 rounded-xl object-cover ring-2 ring-[#FFE600] shadow-sm bg-[#131d36]"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white">Instale no seu iPhone</h4>
            <p className="text-[11px] text-slate-300">
              Toque em <Share className="inline h-3 w-3 text-[#FFE600]" /> e depois em{' '}
              <strong className="text-white">"Adicionar à Tela de Início"</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar aviso"
            className="rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
