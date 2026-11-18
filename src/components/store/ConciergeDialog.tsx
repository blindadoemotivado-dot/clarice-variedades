import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getStoreSettings, openOrderWhatsApp, useStoreSettings } from '@/lib/store-settings';

export const WHATSAPP_NUMBER = getStoreSettings().whatsappNumber;

export function openWhatsApp(text: string) {
  openOrderWhatsApp(text);
}

export function ConciergeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [settings] = useStoreSettings();
  const [msg, setMsg] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Procurando algo específico?</DialogTitle>
          <DialogDescription>Peça o link com desconto para a Clarice no WhatsApp!</DialogDescription>
        </DialogHeader>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Quero uma cafeteira elétrica até R$ 200,00" rows={4} />
        <button type="button" disabled={!msg.trim()}
          onClick={() => { openOrderWhatsApp(`Olá, Clarice! Estou procurando: ${msg.trim()}`); onOpenChange(false); setMsg(''); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp py-2.5 text-sm font-semibold text-on-brand hover:bg-whatsapp-hover disabled:opacity-50">
          <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
        </button>
      </DialogContent>
    </Dialog>
  );
}
