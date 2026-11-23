import { useState, type FormEvent } from 'react';
import { KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreSettings } from '@/lib/store-settings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface AdminPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminPinDialog({ open, onOpenChange, onSuccess }: AdminPinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const configuredPin = getStoreSettings().adminPin?.trim();
  const envPin = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim();
  const validPins = Array.from(
    new Set([configuredPin, envPin].filter(Boolean) as string[])
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const entered = pin.trim();

    if (!entered) {
      setError(true);
      toast.error('Digite o PIN de segurança.');
      return;
    }

    if (validPins.includes(entered)) {
      try {
        sessionStorage.setItem('clarice_admin_authenticated', 'true');
      } catch {
        // sessionStorage may fail in private mode
      }
      setError(false);
      setPin('');
      toast.success('Acesso autorizado ao painel administrativo!');
      onOpenChange(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
      toast.error('PIN incorreto. Acesso restrito a administradores.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-zinc-100 p-6">
        <DialogHeader className="text-left space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 ring-2 ring-cyan-400/20">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-zinc-50">
            Acesso Restrito — Painel Clarice
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed">
            Área de curadoria e gestão da Clarice Achadinhos. Insira o PIN de administrador para continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              PIN de Segurança
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Digite o PIN..."
                className={`w-full rounded-xl border bg-zinc-900/80 px-3.5 py-2.5 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-white/10 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20'
                }`}
              />
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-rose-400">
                <ShieldAlert className="h-3.5 w-3.5" /> PIN inválido. Tente novamente.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-cyan-300 transition"
            >
              Entrar no Painel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
