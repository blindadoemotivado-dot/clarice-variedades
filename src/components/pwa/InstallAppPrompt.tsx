import { useEffect, useState, useCallback, useMemo } from 'react';
import { Download, Share, X, PlusSquare, Smartphone, Check } from 'lucide-react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __clarice_deferred_pwa_prompt?: BeforeInstallPromptEvent | null;
  }
}

const DISMISS_KEY = 'clarice_pwa_dismissed_v2';
const COOLDOWN_DAYS = 5;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function checkIsIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
}

/**
 * Hook utilitário para saber se o app já está rodando instalado (standalone)
 */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(checkIsStandalone());
  }, []);

  return isStandalone;
}

/**
 * Botão discreto para cabeçalhos / menus da vitrine e do painel admin.
 * Permite ao usuário instalar a qualquer momento com 1 clique.
 */
export function InstallHeaderButton({ className = '' }: { className?: string }) {
  const isStandalone = useIsStandalone();

  const handleInstallClick = () => {
    if (typeof window === 'undefined') return;

    if (window.__clarice_deferred_pwa_prompt) {
      window.__clarice_deferred_pwa_prompt.prompt().then(() => {
        window.__clarice_deferred_pwa_prompt?.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            window.__clarice_deferred_pwa_prompt = null;
          }
        });
      });
      return;
    }

    // Dispara evento para abrir o modal de instruções / guia de instalação
    window.dispatchEvent(new CustomEvent('clarice:open-install-prompt'));
  };

  if (isStandalone) return null;

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      title="Instalar aplicativo oficial no celular ou computador"
      aria-label="Instalar Aplicativo Oficial"
      className={`inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-400/20 active:scale-95 transition backdrop-blur-xs shadow-xs ${className}`}
    >
      <Download className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
      <span className="hidden sm:inline">Instalar App</span>
      <span className="sm:hidden">App</span>
    </button>
  );
}

/**
 * Card / Prompt de instalação Flutuante com Glassmorphism.
 * Suporta Android/Chrome nativo, iOS Safari com passo-a-passo e Multi-Tenant.
 */
export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // Detecção de loja ativa (Multi-Tenant)
  const storeBranding = useMemo(() => {
    if (typeof window === 'undefined') {
      return { name: 'Clarice Achadinhos', shortName: 'Achadinhos', icon: '/icons/icon-192x192.png' };
    }

    const searchParams = new URLSearchParams(window.location.search);
    const lojaParam = searchParams.get('loja')?.trim();
    const pathname = window.location.pathname;

    let storeName = 'Clarice Achadinhos';
    let shortName = 'Achadinhos';

    if (pathname.startsWith('/admin')) {
      const adminSlug = sessionStorage.getItem('clarice_admin_store_slug') || lojaParam;
      if (adminSlug && adminSlug !== 'clarice') {
        const formatted = adminSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        storeName = `${formatted} (Painel)`;
        shortName = formatted;
      } else {
        storeName = 'Clarice Achadinhos (Painel)';
      }
    } else if (lojaParam && lojaParam !== 'clarice') {
      const formatted = lojaParam.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      storeName = formatted;
      shortName = formatted;
    }

    return {
      name: storeName,
      shortName,
      icon: '/icons/icon-192x192.png',
    };
  }, []);

  useEffect(() => {
    const standaloneMode = checkIsStandalone();
    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    const iosDevice = checkIsIos();
    setIsIos(iosDevice);

    // Verifica se foi dispensado nos últimos 5 dias
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    const hasCooldown = lastDismissed && Date.now() - parseInt(lastDismissed, 10) < COOLDOWN_MS;

    // Captura o evento nativo do Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      window.__clarice_deferred_pwa_prompt = promptEvent;

      if (!hasCooldown) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Se já tinha capturado anteriormente antes de montar o componente
    if (window.__clarice_deferred_pwa_prompt) {
      setDeferredPrompt(window.__clarice_deferred_pwa_prompt);
      if (!hasCooldown) {
        setIsVisible(true);
      }
    } else if (iosDevice && !hasCooldown) {
      // No iOS, se não estiver em cooldown, exibe suavemente após 3 segundos
      const timer = window.setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    // Ouvinte para abertura manual (ex.: via botão "Instalar App" no header)
    const handleManualOpen = () => {
      setManualOpen(true);
      setIsVisible(true);
    };

    window.addEventListener('clarice:open-install-prompt', handleManualOpen);

    // Ouvinte quando o app termina de ser instalado com sucesso
    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      window.__clarice_deferred_pwa_prompt = null;
      window.setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('clarice:open-install-prompt', handleManualOpen);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setManualOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.__clarice_deferred_pwa_prompt;
    if (!promptEvent) {
      // Se não temos deferredPrompt (ex.: Safari ou Chrome sem trigger pronto), mostra passos
      return;
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalledSuccess(true);
        setDeferredPrompt(null);
        window.__clarice_deferred_pwa_prompt = null;
        window.setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      } else {
        handleDismiss();
      }
    } catch {
      handleDismiss();
    }
  };

  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <aside
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 mx-auto max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 p-3 sm:p-3.5 text-white shadow-2xl backdrop-blur-md ring-1 ring-black/40">
        {/* Glow sutil de fundo */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl" />

        {/* Sucesso pós-instalação */}
        {installedSuccess ? (
          <div className="flex items-center gap-3 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
              <Check className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white">App instalado com sucesso!</h3>
              <p className="text-[11px] text-slate-300">Ícone adicionado à sua tela inicial.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Cabeçalho do Card: Ícone + Título + Fechar */}
            <div className="flex items-start gap-3">
              <img
                src={storeBranding.icon}
                alt={storeBranding.name}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-yellow-400/40 bg-slate-900 shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 id="pwa-install-title" className="text-xs sm:text-sm font-extrabold tracking-tight text-white truncate">
                    {storeBranding.name}
                  </h3>
                  <span className="shrink-0 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-yellow-400">
                    App
                  </span>
                </div>
                <p id="pwa-install-desc" className="text-[11px] text-slate-300 truncate">
                  App Oficial · Leve, rápido e sem barras
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Fechar aviso de instalação"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Corpo: Android / Chrome Nativo vs. iOS Safari vs. Outros */}
            {deferredPrompt ? (
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  Agora não
                </button>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:bg-yellow-300 active:scale-95 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar App (1 toque)</span>
                </button>
              </div>
            ) : isIos ? (
              <div className="space-y-2 pt-1 border-t border-white/10">
                <div className="rounded-xl bg-white/5 p-2 text-[11px] text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 font-bold text-blue-400 text-[10px]">
                      1
                    </span>
                    <span>
                      Toque em <strong>Compartilhar</strong>{' '}
                      <Share className="inline h-3.5 w-3.5 text-blue-400 -mt-0.5" /> no Safari
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-400/20 font-bold text-yellow-400 text-[10px]">
                      2
                    </span>
                    <span>
                      Selecione <strong>Adicionar à Tela de Início</strong>{' '}
                      <PlusSquare className="inline h-3.5 w-3.5 text-yellow-400 -mt-0.5" />
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-xl bg-yellow-400 px-3.5 py-1 text-xs font-black text-slate-950 hover:bg-yellow-300 active:scale-95 transition"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1 border-t border-white/10">
                <p className="text-[11px] text-slate-300">
                  No menu do navegador (<strong>⋮</strong> ou ícone de instalar na barra), toque em{' '}
                  <strong className="text-yellow-400">Instalar aplicativo</strong> ou{' '}
                  <strong>Adicionar à tela inicial</strong>.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-xl bg-yellow-400 px-3.5 py-1 text-xs font-black text-slate-950 hover:bg-yellow-300 active:scale-95 transition"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default InstallAppPrompt;
