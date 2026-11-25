import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LojistaBatchImport } from './LojistaBatchImport';
import type { PlanPermissions } from '@/config/planPermissions';
import type { LojaAfiliado } from '@/types/tenant';
import { extractProductMetadataServerFn } from '@/services/productMetadataServerFn';
import { toast } from 'sonner';

vi.mock('@/services/productMetadataServerFn', () => ({
  extractProductMetadataServerFn: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
  isSupabaseConfigured: true,
}));

const mockStartPermissions: PlanPermissions = {
  maxProducts: 50,
  batchImportLimit: 0,
  customBranding: true,
  vipDispatcherMode: 'basic',
  customDomain: false,
};

const mockProPermissions: PlanPermissions = {
  maxProducts: Infinity,
  batchImportLimit: 20,
  customBranding: true,
  vipDispatcherMode: 'full',
  customDomain: false,
};

const mockStartStore: LojaAfiliado = {
  id: 'store-start',
  slug: 'loja-iniciante',
  nomeLoja: 'Loja Iniciante',
  plano: 'start',
  statusAssinatura: 'ativo',
  corPrimaria: '#0F172A',
  corDestaque: '#FFE600',
};

const mockProStore: LojaAfiliado = {
  id: 'store-pro',
  slug: 'loja-pro',
  nomeLoja: 'Loja Pro',
  plano: 'pro',
  statusAssinatura: 'ativo',
  corPrimaria: '#0F172A',
  corDestaque: '#FFE600',
};

describe('LojistaBatchImport', () => {
  it('blocks batch import when user is lojista on Start plan without bypass', () => {
    const handleUpgrade = vi.fn();
    render(
      <LojistaBatchImport
        lojaSlug="loja-iniciante"
        store={mockStartStore}
        currentProductCount={10}
        permissions={mockStartPermissions}
        onUpgrade={handleUpgrade}
      />
    );

    expect(screen.getByText(/Recurso Exclusivo • Plano Pro/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Fazer Upgrade para o Plano Pro/i })
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).not.toBeInTheDocument();
  });

  it('unconditionally unlocks batch import when isSuperAdmin is true', () => {
    render(
      <LojistaBatchImport
        lojaSlug="loja-iniciante"
        store={mockStartStore}
        currentProductCount={10}
        permissions={mockStartPermissions}
        isSuperAdmin={true}
      />
    );

    expect(screen.queryByText(/Recurso Exclusivo • Plano Pro/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).toBeInTheDocument();
    expect(screen.getByText(/Importação em Lote/i)).toBeInTheDocument();
  });

  it('unconditionally unlocks batch import when store slug is clarice', () => {
    render(
      <LojistaBatchImport
        lojaSlug="clarice"
        store={{ ...mockStartStore, slug: 'clarice' }}
        currentProductCount={10}
        permissions={mockStartPermissions}
      />
    );

    expect(screen.queryByText(/Recurso Exclusivo • Plano Pro/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).toBeInTheDocument();
  });

  it('unlocks batch import when store plan is pro', () => {
    render(
      <LojistaBatchImport
        lojaSlug="loja-pro"
        store={mockProStore}
        currentProductCount={10}
        permissions={mockProPermissions}
      />
    );

    expect(screen.queryByText(/Recurso Exclusivo • Plano Pro/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).toBeInTheDocument();
  });

  it('processes batch links via extractProductMetadataServerFn with poka-yoke validation', async () => {
    vi.mocked(extractProductMetadataServerFn).mockResolvedValueOnce({
      success: true,
      title: 'Garrafa Térmica Inox 1L',
      currentPrice: '59.90',
      originalPrice: '79.90',
      imageUrl: 'https://images.shopee.com/garrafa.jpg',
      marketplace: 'shopee',
      category: 'Casa & Cozinha',
      partial: false,
    });

    render(
      <LojistaBatchImport
        lojaSlug="loja-pro"
        store={mockProStore}
        currentProductCount={10}
        permissions={mockProPermissions}
      />
    );

    const textarea = screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i);
    fireEvent.change(textarea, { target: { value: 'https://s.shopee.com.br/test12345' } });

    const processBtn = screen.getByRole('button', { name: /Processar Links/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(extractProductMetadataServerFn).toHaveBeenCalled();
      expect(screen.getByText('Garrafa Térmica Inox 1L')).toBeInTheDocument();
    });

    expect(screen.getByText(/Todos prontos para salvar/i)).toBeInTheDocument();
  });

  it('flags items with zero price as pending and blocks saving until price is informed', async () => {
    vi.mocked(extractProductMetadataServerFn).mockResolvedValueOnce({
      success: true,
      title: 'Item Sem Preço Identificado',
      currentPrice: undefined,
      originalPrice: undefined,
      imageUrl: 'https://images.shopee.com/item.jpg',
      marketplace: 'shopee',
      category: 'Casa & Cozinha',
      partial: true,
    });

    render(
      <LojistaBatchImport
        lojaSlug="loja-pro"
        store={mockProStore}
        currentProductCount={10}
        permissions={mockProPermissions}
      />
    );

    const textarea = screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i);
    fireEvent.change(textarea, { target: { value: 'https://s.shopee.com.br/zeroprice' } });

    const processBtn = screen.getByRole('button', { name: /Processar Links/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(screen.getByText('Item Sem Preço Identificado')).toBeInTheDocument();
    });

    expect(screen.getByText(/1 pendente\(s\) de ajuste/i)).toBeInTheDocument();
    expect(screen.getByText(/Obrigatório/i)).toBeInTheDocument();

    // Tenta salvar sem preencher o preço
    const saveBtn = screen.getByRole('button', { name: /Salvar Produtos Prontos/i });
    fireEvent.click(saveBtn);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Nenhum produto válido para salvar')
    );

    // Preenche o preço inline
    const priceInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(priceInput, { target: { value: '49.90' } });

    expect(screen.getByText(/Todos prontos para salvar/i)).toBeInTheDocument();
  });
});
