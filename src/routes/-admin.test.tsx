import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminRoutePage } from './admin';

// Mock ResizeObserver para Radix UI em ambiente JSDOM
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.scrollTo = vi.fn();
  (window as any).ResizeObserver = MockResizeObserver;
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminRoutePage (/admin)', () => {
  it('renderiza a tela de login inicial com segurança e sem exceções', () => {
    render(<AdminRoutePage />);

    expect(screen.getByText(/Acesso ao Painel Clarice/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Super Admin/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Lojista Assinante/i })).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText('••••••••');
    expect(pinInput).toBeInTheDocument();
    expect(pinInput).toHaveAttribute('type', 'password');
    expect(pinInput).toHaveAttribute('autocomplete', 'current-password');
  });

  it('permite alternar para o modo de login do Lojista Assinante', () => {
    render(<AdminRoutePage />);

    const lojistaBtn = screen.getByRole('button', { name: /Lojista Assinante/i });
    fireEvent.click(lojistaBtn);

    expect(screen.getByPlaceholderText('seuemail@exemplo.com.br')).toBeInTheDocument();
    expect(screen.getByText(/Ainda não tem uma loja\? Criar minha loja/i)).toBeInTheDocument();
  });

  it('sobrevive e renderiza com segurança mesmo com dados corrompidos no localStorage ou sessionStorage', () => {
    localStorage.setItem('clarice_admin_session', '{ invalid json garbage');
    localStorage.setItem('clarice_lojista_session', '{"corrupted": true}');
    sessionStorage.setItem('clarice_admin_authenticated', 'random_string');

    expect(() => render(<AdminRoutePage />)).not.toThrow();
    expect(screen.getByText(/Acesso ao Painel Clarice/i)).toBeInTheDocument();
  });

  it('restaura sessão autenticada do Super Admin sem lançar exceções', async () => {
    sessionStorage.setItem('clarice_admin_authenticated', 'true');
    sessionStorage.setItem('clarice_admin_role', 'super_admin');

    render(<AdminRoutePage />);

    await waitFor(() => {
      expect(screen.getByText(/Painel Super Admin • Clarice SaaS/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Super Admin/i).length).toBeGreaterThan(0);
    });
  });

  it('restaura sessão autenticada de Lojista Assinante a partir do localStorage sem lançar exceções', async () => {
    const mockStore = {
      id: 'demo-id',
      slug: 'loja-demo',
      nomeLoja: 'Loja Teste Demo',
      plano: 'pro',
      statusAssinatura: 'ativo',
      corPrimaria: '#0F172A',
      corDestaque: '#FFE600',
    };

    localStorage.setItem(
      'clarice_lojista_session',
      JSON.stringify({ slug: 'loja-demo', store: mockStore, timestamp: Date.now() })
    );

    render(<AdminRoutePage />);

    await waitFor(() => {
      expect(screen.getByText(/Gestão • Loja Teste Demo/i)).toBeInTheDocument();
      expect(screen.getByText(/Ver Minha Vitrine/i)).toBeInTheDocument();
    });
  });

  it('permite ao Super Admin alternar rapidamente para o Painel Clarice e retornar em 1 clique', async () => {
    sessionStorage.setItem('clarice_admin_authenticated', 'true');
    sessionStorage.setItem('clarice_admin_role', 'super_admin');

    render(<AdminRoutePage />);

    await waitFor(() => {
      expect(screen.getByText(/Painel Super Admin • Clarice SaaS/i)).toBeInTheDocument();
    });

    const clariceBtn = screen.getByRole('button', { name: /Painel Clarice/i });
    expect(clariceBtn).toBeInTheDocument();

    fireEvent.click(clariceBtn);

    await waitFor(() => {
      expect(screen.getByText(/Gestão • Clarice Achadinhos/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Voltar ao Super Admin/i })).toBeInTheDocument();
    });

    const returnBtn = screen.getByRole('button', { name: /Voltar ao Super Admin/i });
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByText(/Painel Super Admin • Clarice SaaS/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Painel Clarice/i })).toBeInTheDocument();
    });
  });
});
