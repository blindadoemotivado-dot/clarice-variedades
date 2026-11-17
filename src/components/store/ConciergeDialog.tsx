import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const WHATSAPP_NUMBER = '5511999999999';

export function openWhatsApp(text: string) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function ConciergeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [msg, setMsg] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Procurando algo específico?</DialogTitle>
          <DialogDescription>Peça o link com desconto para a Zizi no WhatsApp!</DialogDescription>
        </DialogHeader>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Quero uma cafeteira elétrica até R$ 200,00" rows={4} />
        <button type="button" disabled={!msg.trim()}
          onClick={() => { openWhatsApp(`Olá, Zizi! Estou procurando: ${msg.trim()}`); onOpenChange(false); setMsg(''); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp py-2.5 text-sm font-semibold text-on-brand hover:bg-whatsapp-hover disabled:opacity-50">
          <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
        </button>
      </DialogContent>
    </Dialog>
  );
}
