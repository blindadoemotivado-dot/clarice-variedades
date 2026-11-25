import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, type FormEvent } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  createStore,
  checkSlugAvailable,
  createAsaasCheckout,
} from '@/services/tenantService';
import {
  PLANO_PRICES,
  type SubscriptionPlan,
  type LojaAfiliado,
} from '@/types/tenant';
import { PLAN_CARDS } from '@/config/planPermissions';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/criar-loja')({
  head: () => ({
    meta: [{ title: 'Criar Minha Loja • Clarice Achadinhos SaaS' }],
  }),
  component: CriarLojaPage,
});

function CriarLojaPage() {
  // Dados Pessoais / Lojista
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');

  // Dados da Loja
  const [nomeLoja, setNomeLoja] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  // Plano Selecionado
  const [plano, setPlano] = useState<SubscriptionPlan>('pro');

  // Estado de envio e tela de confirmação
  const [submitting, setSubmitting] = useState(false);
  const [successStore, setSuccessStore] = useState<LojaAfiliado | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  // Auto-geração e validação de slug
  useEffect(() => {
    if (!slugManual && nomeLoja.trim()) {
      const generated = nomeLoja
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  }, [nomeLoja, slugManual]);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const isAvailable = await checkSlugAvailable(slug);
      setSlugStatus(isAvailable ? 'available' : 'unavailable');
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // Formatação de CPF/CNPJ
  const handleCpfCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 11) {
      // CPF: 000.000.000-00
      setCpfCnpj(
        raw
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      );
    } else {
      // CNPJ: 00.000.000/0000-00
      setCpfCnpj(
        raw
          .slice(0, 14)
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
      );
    }
  };

  // Formatação de WhatsApp
  const handleWhatsappChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      setWhatsapp(raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3'));
    } else {
      setWhatsapp(raw.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3'));
    }
  };

  // Submissão do Formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || !password.trim() || !whatsapp.trim() || !cpfCnpj.trim() || !nomeLoja.trim() || !slug.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.trim().length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (slugStatus === 'unavailable') {
      toast.error('O slug escolhido já está em uso. Por favor, escolha outro nome para sua URL.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Cadastra a loja com status_assinatura = 'pendente'
      const created = await createStore({
        slug,
        nomeLoja: nomeLoja.trim(),
        subtitulo: `Achadinhos selecionados e ofertas imperdíveis por ${nomeLoja.trim()}`,
        plano,
        statusAssinatura: 'pendente',
        ownerEmail: email.trim().toLowerCase(),
        ownerPassword: password.trim(),
        whatsappContato: whatsapp.trim(),
        cpfCnpj: cpfCnpj.trim(),
      });

      // 2. Dispara a criação do checkout e assinatura no Asaas
      const checkoutRes = await createAsaasCheckout({
        loja_slug: created.slug,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
        plano,
      });

      const finalPaymentUrl = checkoutRes.paymentUrl || `https://www.asaas.com/c/${created.slug}`;
      setPaymentUrl(finalPaymentUrl);
      setSuccessStore(created);
      toast.success('Solicitação de abertura recebida com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar cadastro. Tente novamente ou fale com o suporte.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // TELA DE CONFIRMAÇÃO PÓS-CADASTRO
  // =========================================================================
  if (successStore) {
    return (
      <div className="min-h-screen bg-[#05070B] text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-[#0F172A] p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-400 mb-2">
            <Clock className="h-3.5 w-3.5" /> Aguardando Aprovação
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Solicitação de Abertura Recebida!
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            Sua loja <strong className="text-white">"{successStore.nomeLoja}"</strong> (<code>/{successStore.slug}</code>) foi cadastrada e está na fila de ativação do administrador.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Plano Escolhido:</span>
              <span className="font-bold text-white capitalize">{successStore.plano} ({PLANO_PRICES[successStore.plano]?.price})</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">E-mail de Login:</span>
              <span className="font-mono text-slate-200">{successStore.ownerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Link Oficial da Vitrine:</span>
              <span className="font-bold text-[#FFE600]">/?loja={successStore.slug}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {paymentUrl && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
              >
                <CreditCard className="h-4 w-4" />
                <span>Pagar Assinatura Agora (PIX / Cartão)</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-[11px] text-slate-400 leading-relaxed text-left">
              ℹ️ <strong>Como funciona a liberação:</strong> Assim que seu pagamento for confirmado ou o administrador aprovar seu cadastro, sua vitrine será ativada automaticamente e você receberá acesso ao painel do lojista.
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href="/admin"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition text-center"
              >
                Ir para o Painel Administrativo
              </a>
              <a
                href="/"
                className="flex-1 rounded-xl border border-transparent py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition text-center"
              >
                ← Voltar para a Início
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FORMULÁRIO DE AUTO-CADASTRO
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#05070B] text-slate-100 flex flex-col justify-between w-full max-w-[100vw] overflow-x-hidden">
      {/* Header Superior */}
      <header className="border-b border-slate-900 bg-[#0A0E17]/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img
              src="/icons/icon-192x192.png"
              alt="Clarice Achadinhos"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[#FFE600] bg-[#0F172A]"
            />
            <span className="text-base font-extrabold tracking-tight text-white">
              Clarice Achadinhos <span className="text-xs font-black uppercase text-[#FFE600] bg-[#FFE600]/10 px-2 py-0.5 rounded-md ml-1">SaaS</span>
            </span>
          </a>

          <div className="flex items-center gap-3 text-xs">
            <a
              href="/admin"
              className="text-slate-400 hover:text-white transition font-medium"
            >
              Já é lojista? <span className="text-[#FFE600] font-bold underline">Entrar</span>
            </a>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE600]/30 bg-[#FFE600]/10 px-3.5 py-1 text-xs font-bold text-[#FFE600] mb-3">
            <Rocket className="h-3.5 w-3.5" />
            <span>Abra Sua Vitrine de Afiliado em Menos de 2 Minutos</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Tenha Sua Própria Loja de Achadinhos e Venda Todo Dia
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Monetize ofertas do Mercado Livre e Shopee com sua marca, seu grupo VIP no WhatsApp e receba comissões automáticas diretamente na sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloco 1: Dados do Lojista */}
          <div className="rounded-3xl border border-slate-800/80 bg-[#0F172A] p-5 sm:p-7 shadow-xl">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <User className="h-4 w-4 text-[#FFE600]" />
              1. Seus Dados de Responsável
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail de Acesso ao Painel *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com.br"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CPF ou CNPJ (obrigatório para cobrança Asaas) *
                </label>
                <input
                  type="text"
                  required
                  value={cpfCnpj}
                  onChange={(e) => handleCpfCnpjChange(e.target.value)}
                  placeholder="000.000.000-00 ou CNPJ"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha de Acesso ao Painel *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina uma senha segura (mínimo 6 caracteres)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Esta senha será usada junto com seu e-mail para acessar seu catálogo exclusivo em <strong>/admin</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 2: Dados da Sua Loja */}
          <div className="rounded-3xl border border-slate-800/80 bg-[#0F172A] p-5 sm:p-7 shadow-xl">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Store className="h-4 w-4 text-[#FFE600]" />
              2. Identidade da Sua Vitrine
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Sua Loja *
                </label>
                <input
                  type="text"
                  required
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                  placeholder="Ex: Achadinhos da Carol"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Slug da URL Exclusiva *
                  </label>
                  {slugStatus === 'checking' && (
                    <span className="text-[10px] text-slate-400">Verificando...</span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Disponível
                    </span>
                  )}
                  {slugStatus === 'unavailable' && (
                    <span className="text-[10px] font-bold text-red-400">Já utilizado</span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                  }}
                  placeholder="ex: achadinhos-da-carol"
                  className={cn(
                    'w-full rounded-xl border bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]',
                    slugStatus === 'available'
                      ? 'border-emerald-500/50'
                      : slugStatus === 'unavailable'
                      ? 'border-red-500/50'
                      : 'border-slate-800'
                  )}
                />
              </div>
            </div>

            {slug && (
              <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 flex items-center gap-2 text-xs">
                <Globe className="h-4 w-4 text-[#FFE600] shrink-0" />
                <span className="text-slate-400">Sua vitrine oficial ficará em:</span>
                <strong className="text-white font-mono">clariceachadinhos.vercel.app/?loja={slug}</strong>
              </div>
            )}
          </div>

          {/* Bloco 3: Escolha do Plano SaaS */}
          <div className="rounded-3xl border border-slate-800/80 bg-[#0F172A] p-5 sm:p-7 shadow-xl">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Zap className="h-4 w-4 text-[#FFE600]" />
              3. Escolha Seu Plano de Assinatura
            </h2>

            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
              {PLAN_CARDS.map((card) => {
                const isSelected = plano === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setPlano(card.id)}
                    className={cn(
                      'relative rounded-2xl border p-4 cursor-pointer transition flex flex-col justify-between select-none',
                      isSelected
                        ? 'border-[#FFE600] bg-[#FFE600]/10 ring-2 ring-[#FFE600]'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    )}
                  >
                    {card.badge && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-[#FFE600] px-2.5 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-sm">
                        {card.badge}
                      </span>
                    )}
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-1">
                        {card.name}
                        {card.id === 'pro' && <Sparkles className="h-3.5 w-3.5 text-[#FFE600]" />}
                      </h3>
                      <div className="mt-2 text-xl font-black text-white">
                        R$ {card.value}
                        <span className="text-xs font-normal text-slate-400">/mês</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                        {card.description}
                      </p>
                      <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                        {card.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || slugStatus === 'unavailable'}
              className="w-full rounded-2xl bg-[#FFE600] py-4 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition disabled:opacity-50"
            >
              {submitting ? 'Processando cadastro e gerando fatura...' : 'Finalizar Cadastro & Gerar Assinatura Asaas'}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              🔒 Pagamento seguro processado via Asaas. Sua vitrine é ativada após a confirmação.
            </p>
          </div>
        </form>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-900 bg-[#0A0E17] py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 FCIA — Fernando Cabral Inteligência Artificial • Plataforma Multi-Tenant de Afiliados</p>
      </footer>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
