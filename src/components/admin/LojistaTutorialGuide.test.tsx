import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LojistaTutorialGuide } from './LojistaTutorialGuide';
import * as tutorialService from '@/services/tutorialService';
import type { LojaAfiliado } from '@/types/tenant';
import type { TutorialLesson } from '@/types/tutorial';

const mockStore: LojaAfiliado = {
  id: 'store-123',
  slug: 'loja-teste',
  nomeLoja: 'Loja Teste',
  subtitulo: 'Melhores achadinhos',
  ownerEmail: 'teste@loja.com',
  ownerName: 'Lojista Teste',
  plano: 'pro',
  statusAssinatura: 'ativo',
  corPrimaria: '#0F172A',
  corSecundaria: '#FFE600',
  whatsappVipUrl: 'https://chat.whatsapp.com/test',
  ativo: true,
  criadoEm: '2026-11-24T00:00:00Z',
};

const mockLessons: TutorialLesson[] = [
  {
    id: 'aula-1',
    ordem: 1,
    titulo: 'Conhecendo seu Painel e sua Vitrine',
    duracao: '01:00',
    descricao: 'Visão geral do painel.',
    roteiroPassos: ['Passo 1', 'Passo 2', 'Passo 3'],
    targetTab: 'vitrine',
    actionLabel: '↗ Abrir Minha Vitrine',
    videoUrl: null,
  },
  {
    id: 'aula-2',
    ordem: 2,
    titulo: 'Deixando a Loja com a sua Cara',
    duracao: '01:00',
    descricao: 'Personalize cores e logo.',
    roteiroPassos: ['Passo 1', 'Passo 2', 'Passo 3'],
    targetTab: 'minha-loja',
    actionLabel: 'Personalizar Minha Loja',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
];

describe('LojistaTutorialGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the Clarice mascot banner and title', async () => {
    vi.spyOn(tutorialService, 'fetchTutorials').mockResolvedValue(mockLessons);

    render(<LojistaTutorialGuide store={mockStore} onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Aprenda em 1 Minuto com a Clarice 🎓/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByAltText('Mascote Clarice')).toBeInTheDocument();
    expect(screen.getByText(/Central de Treinamento Oficial/i)).toBeInTheDocument();
  });

  it('renders lessons and fallback placeholder when videoUrl is null', async () => {
    vi.spyOn(tutorialService, 'fetchTutorials').mockResolvedValue(mockLessons);

    render(<LojistaTutorialGuide store={mockStore} onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Conhecendo seu Painel e sua Vitrine')).toBeInTheDocument();
      expect(screen.getByText('Deixando a Loja com a sua Cara')).toBeInTheDocument();
    });

    // Aula 1 has videoUrl = null, should show placeholder
    expect(
      screen.getByText(/🎬 Vídeo em Produção • Em Breve Disponível/i)
    ).toBeInTheDocument();
  });

  it('renders iframe when a YouTube videoUrl is provided', async () => {
    vi.spyOn(tutorialService, 'fetchTutorials').mockResolvedValue(mockLessons);

    render(<LojistaTutorialGuide store={mockStore} onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Deixando a Loja com a sua Cara')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('Deixando a Loja com a sua Cara') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('calls onNavigateTab when clicking tab navigation action buttons', async () => {
    const handleNavigate = vi.fn();
    vi.spyOn(tutorialService, 'fetchTutorials').mockResolvedValue(mockLessons);

    render(<LojistaTutorialGuide store={mockStore} onNavigateTab={handleNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Personalizar Minha Loja')).toBeInTheDocument();
    });

    const actionBtn = screen.getByRole('button', { name: /Personalizar Minha Loja/i });
    fireEvent.click(actionBtn);

    expect(handleNavigate).toHaveBeenCalledWith('minha-loja');
  });

  it('opens store in a new window when clicking vitrine action button', async () => {
    const handleNavigate = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(tutorialService, 'fetchTutorials').mockResolvedValue(mockLessons);

    render(<LojistaTutorialGuide store={mockStore} onNavigateTab={handleNavigate} />);

    await waitFor(() => {
      expect(screen.getByText(/↗ Abrir Minha Vitrine/i)).toBeInTheDocument();
    });

    const vitrineBtn = screen.getByRole('button', { name: /↗ Abrir Minha Vitrine/i });
    fireEvent.click(vitrineBtn);

    expect(openSpy).toHaveBeenCalledWith('/?loja=loja-teste', '_blank', 'noopener,noreferrer');
    expect(handleNavigate).not.toHaveBeenCalled();
  });

  it('toggles completion status and saves to localStorage', async () => {
    vi.spyOn(tutorialService, 'fetchTutorials').mockResolvedValue(mockLessons);

    render(<LojistaTutorialGuide store={mockStore} onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Conhecendo seu Painel e sua Vitrine')).toBeInTheDocument();
    });

    const completeButtons = screen.getAllByRole('button', { name: /Marcar Concluída/i });
    expect(completeButtons.length).toBeGreaterThan(0);

    // Click to complete first lesson
    fireEvent.click(completeButtons[0]);

    await waitFor(() => {
      const stored = localStorage.getItem('clarice_tutorial_progress_loja-teste');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual({ 'aula-1': true });
    });
  });
});
