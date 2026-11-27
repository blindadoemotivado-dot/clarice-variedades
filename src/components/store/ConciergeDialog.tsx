import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getStoreSettings, openOrderWhatsApp, useStoreSettings } from '@/lib/store-settings';

export const WHATSAPP_NUMBER = getStoreSettings().whatsappNumber;

export function openWhatsApp(text: string) {
  openOrderWhatsApp(text);
}

export function ConciergeDialog({
  open,
  onOpenChange,
  storeName,
  whatsappNumber,
  vipUrl,
  isPartnerStore = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeName?: string;
  whatsappNumber?: string;
  vipUrl?: string;
  isPartnerStore?: boolean;
}) {
  const [settings] = useStoreSettings();
  const [msg, setMsg] = useState('');

  const displayName = storeName || 'Clarice Achadinhos';
  const effectiveNumber = (whatsappNumber || '').replace(/\D/g, '') || (!isPartnerStore ? (settings.whatsappNumber.replace(/\D/g, '') || '5511999999999') : '');

  const handleSend = () => {
    const text = `Olá, ${displayName}! Estou procurando: ${msg.trim()}`;
    if (effectiveNumber) {
      window.open(`https://wa.me/${effectiveNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    } else if (vipUrl) {
      window.open(vipUrl, '_blank', 'noopener,noreferrer');
    } else {
      openOrderWhatsApp(text);
    }
    onOpenChange(false);
    setMsg('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Procurando algo específico?</DialogTitle>
          <DialogDescription>
            {isPartnerStore
              ? `Peça o link com desconto para ${displayName} no WhatsApp!`
              : 'Peça o link com desconto para a Clarice no WhatsApp!'}
          </DialogDescription>
        </DialogHeader>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Quero uma cafeteira elétrica até R$ 200,00" rows={4} />
        <button
          type="button"
          disabled={!msg.trim()}
          onClick={handleSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp py-2.5 text-sm font-semibold text-on-brand hover:bg-whatsapp-hover disabled:opacity-50 cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
        </button>
      </DialogContent>
    </Dialog>
  );
}
