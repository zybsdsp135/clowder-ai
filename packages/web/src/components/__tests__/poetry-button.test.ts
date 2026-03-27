import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PoetryButton } from '@/components/PoetryButton';

beforeAll(() => {
  (globalThis as { React?: typeof React }).React = React;
});

afterAll(() => {
  delete (globalThis as { React?: typeof React }).React;
});

let mockApiFetch: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
let container: HTMLDivElement;
let root: Root;

vi.mock('@/utils/api-client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const poemA = {
  poem: {
    id: 'poem-a',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    content: '床前明月光，\n疑是地上霜。',
    annotation: '背景 A',
    appreciation: '赏析 A',
    sourceVersion: 'seed',
    sourceUrl: 'https://example.com/a',
  },
  isFavorite: false,
  suggestionCount: 0,
};

const poemB = {
  poem: {
    id: 'poem-b',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    content: '春眠不觉晓，\n处处闻啼鸟。',
    annotation: '背景 B',
    appreciation: '赏析 B',
    sourceVersion: 'seed',
    sourceUrl: 'https://example.com/b',
  },
  isFavorite: true,
  suggestionCount: 1,
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockApiFetch = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderButton() {
  act(() => {
    root.render(React.createElement(PoetryButton));
  });
}

function getToggle(): HTMLButtonElement {
  return container.querySelector('button[aria-label="每日古诗词"]') as HTMLButtonElement;
}

describe('PoetryButton', () => {
  it('opens and loads today poem on first click', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => poemA,
    });

    renderButton();
    await act(async () => {
      getToggle().click();
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/api/poetry/today');
    expect(container.textContent).toContain('静夜思');
    expect(container.textContent).toContain('李白');
  });

  it('loads next poem and updates title', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => poemA,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => poemB,
      });

    renderButton();
    await act(async () => {
      getToggle().click();
    });

    const nextButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '下一首');
    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.click();
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/poetry/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPoemId: 'poem-a' }),
    });
    expect(container.textContent).toContain('春晓');
  });

  it('toggles favorite and submits suggestion', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => poemA,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => poemB,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...poemB, suggestionCount: 2 }),
      });

    renderButton();
    await act(async () => {
      getToggle().click();
    });

    const favoriteButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '收藏');
    expect(favoriteButton).toBeTruthy();
    await act(async () => {
      favoriteButton?.click();
    });

    expect(mockApiFetch).toHaveBeenNthCalledWith(2, '/api/poetry/poem-a/favorite', {
      method: 'POST',
    });
    expect(container.textContent).toContain('已收藏');

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, '想补一段作者背景。');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '提交建议');
    expect(submitButton).toBeTruthy();
    await act(async () => {
      submitButton?.click();
    });

    expect(mockApiFetch).toHaveBeenNthCalledWith(3, '/api/poetry/poem-b/suggestion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ suggestionText: '想补一段作者背景。' }),
    });
    expect(container.textContent).toContain('建议 2');
  });
});
