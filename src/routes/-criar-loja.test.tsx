import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CriarLojaPage } from './criar-loja';
import * as tenantService from '@/services/tenantService';
import { toast } from 'sonner';

vi.mock('@/services/tenantService', () => ({
  createStore: vi.fn(),
  checkSlugAvailable: vi.fn().mockResolvedValue(true),
  createAsaasCheckout: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CriarLojaPage (/criar-loja)', () => {
  it('renders clean hero and non-technical badges without SAAS or Multi-Tenant jargon', () => {
    render(<CriarLojaPage />);

    expect(
      screen.getByText(/Crie sua loja de achadinhos e comece a vender hoje/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Divulgue produtos do Mercado Livre e da Shopee com a sua marca/i)
    ).toBeInTheDocument();

    expect(screen.getByText('Pronta em minutos')).toBeInTheDocument();
    expect(screen.getByText('Sem precisar de site')).toBeInTheDocument();
    expect(screen.getByText('Ganhe pelo WhatsApp')).toBeInTheDocument();

    // Ensures jargon like "SaaS" or "Multi-Tenant" is not present in header/hero
    expect(screen.queryByText(/Plataforma Multi-Tenant/i)).not.toBeInTheDocument();
  });

  it('pre-selects Pro plan by default and shows accordion for extras', () => {
    render(<CriarLojaPage />);

    expect(screen.getByText('Mais escolhido')).toBeInTheDocument();

    // Check fixed button shows R$ 117/mês by default
    const submitBtn = screen.getByRole('button', { name: /Criar minha loja · R\$ 117\/mês/i });
    expect(submitBtn).toBeInTheDocument();

    // Initially extras are collapsed
    expect(screen.queryByText('Histórico de ofertas enviadas')).not.toBeInTheDocument();

    // Click "Ver tudo" on Pro card
    const verTudoBtns = screen.getAllByRole('button', { name: /Ver tudo/i });
    fireEvent.click(verTudoBtns[1]); // Pro is second card

    // Now extras are shown
    expect(screen.getByText('Histórico de ofertas enviadas')).toBeInTheDocument();
    expect(screen.getByText('Suporte prioritário')).toBeInTheDocument();

    // Click "Ver menos" to collapse
    const verMenosBtn = screen.getByRole('button', { name: /Ver menos/i });
    fireEvent.click(verMenosBtn);
    expect(screen.queryByText('Histórico de ofertas enviadas')).not.toBeInTheDocument();
  });

  it('updates plan selection when clicking Start or Advanced', () => {
    render(<CriarLojaPage />);

    const startPlan = screen.getByText('Start');
    fireEvent.click(startPlan);

    expect(
      screen.getByRole('button', { name: /Criar minha loja · R\$ 67\/mês/i })
    ).toBeInTheDocument();

    const advPlan = screen.getByText('Advanced');
    fireEvent.click(advPlan);

    expect(
      screen.getByRole('button', { name: /Criar minha loja · R\$ 197\/mês/i })
    ).toBeInTheDocument();
  });

  it('auto-generates slug from store name and shows address preview', async () => {
    render(<CriarLojaPage />);

    const storeInput = screen.getByPlaceholderText(/Ex: Achadinhos da Carol/i);
    fireEvent.change(storeInput, { target: { value: 'Loja da Maria & João' } });

    await waitFor(() => {
      expect(screen.getByText('loja-da-maria-joao')).toBeInTheDocument();
    });
  });

  it('validates password length to minimum 8 characters', async () => {
    render(<CriarLojaPage />);

    fireEvent.change(screen.getByPlaceholderText('Como você quer ser chamada(o)'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), {
      target: { value: '11988887777' },
    });
    fireEvent.change(screen.getByPlaceholderText('seuemail@exemplo.com.br'), {
      target: { value: 'maria@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo de 8 caracteres'), {
      target: { value: '12345' }, // < 8
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Achadinhos da Carol/i), {
      target: { value: 'Achadinhos da Maria' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00 ou CNPJ'), {
      target: { value: '12345678909' },
    });

    const form = document.getElementById('criar-loja-form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(toast.error).toHaveBeenCalledWith('A senha deve ter no mínimo 8 caracteres.');
    expect(tenantService.createStore).not.toHaveBeenCalled();
  });

  it('submits form successfully, calls backend functions and renders confirmation screen', async () => {
    const mockStore = {
      id: 'store-123',
      slug: 'achadinhos-da-maria',
      nomeLoja: 'Achadinhos da Maria',
      plano: 'pro' as const,
      statusAssinatura: 'pendente' as const,
      ownerEmail: 'maria@gmail.com',
      corPrimaria: '#0F172A',
      corDestaque: '#FFE600',
    };

    vi.mocked(tenantService.createStore).mockResolvedValueOnce(mockStore);
    vi.mocked(tenantService.createAsaasCheckout).mockResolvedValueOnce({
      success: true,
      paymentUrl: 'https://asaas.com/checkout/test1234',
    });

    render(<CriarLojaPage />);

    fireEvent.change(screen.getByPlaceholderText('Como você quer ser chamada(o)'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), {
      target: { value: '11988887777' },
    });
    fireEvent.change(screen.getByPlaceholderText('seuemail@exemplo.com.br'), {
      target: { value: 'maria@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo de 8 caracteres'), {
      target: { value: 'senhaForte123' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Achadinhos da Carol/i), {
      target: { value: 'Achadinhos da Maria' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00 ou CNPJ'), {
      target: { value: '12345678909' },
    });

    const form = document.getElementById('criar-loja-form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(tenantService.createStore).toHaveBeenCalledWith(
        expect.objectContaining({
          nomeLoja: 'Achadinhos da Maria',
          slug: 'achadinhos-da-maria',
          ownerEmail: 'maria@gmail.com',
          ownerPassword: 'senhaForte123',
          plano: 'pro',
          statusAssinatura: 'pendente',
        })
      );
      expect(tenantService.createAsaasCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          loja_slug: 'achadinhos-da-maria',
          email: 'maria@gmail.com',
          plano: 'pro',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Solicitação de Abertura Recebida!')).toBeInTheDocument();
      expect(screen.getByText(/Pagar Assinatura Agora/i)).toBeInTheDocument();
    });

    // Check FCIA copyright
    expect(
      screen.getByText(/Tecnologia FCIA — Fernando Cabral Inteligência Artificial/i)
    ).toBeInTheDocument();
  });
});
