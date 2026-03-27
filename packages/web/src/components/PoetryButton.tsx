'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/utils/api-client';
import { PoetryIcon } from './icons/PoetryIcon';

interface PoetryItem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  annotation: string | null;
  appreciation: string | null;
  sourceVersion: string;
  sourceUrl: string;
}

interface PoetryResponse {
  poem: PoetryItem;
  isFavorite: boolean;
  suggestionCount: number;
}

function formatPoemContent(content: string): string[] {
  return content.split('\n').map((line) => line.trim()).filter(Boolean);
}

async function parsePoetryResponse(response: Response): Promise<PoetryResponse> {
  const data = (await response.json()) as PoetryResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || '加载古诗词失败');
  }
  return data;
}

export function PoetryButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [poetry, setPoetry] = useState<PoetryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const poemLines = useMemo(() => formatPoemContent(poetry?.poem.content ?? ''), [poetry?.poem.content]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/poetry/today');
      const data = await parsePoetryResponse(response);
      setPoetry(data);
      setDetailOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载古诗词失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !poetry && !loading) {
      void loadCurrent();
    }
  }, [open, poetry, loading, loadCurrent]);

  const handleToggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const handleNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/poetry/next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPoemId: poetry?.poem.id }),
      });
      const data = await parsePoetryResponse(response);
      setPoetry(data);
      setDetailOpen(false);
      setSuggestionText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换下一首失败');
    } finally {
      setLoading(false);
    }
  }, [poetry?.poem.id]);

  const handleFavorite = useCallback(async () => {
    if (!poetry) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/poetry/${poetry.poem.id}/favorite`, {
        method: poetry.isFavorite ? 'DELETE' : 'POST',
      });
      const data = await parsePoetryResponse(response);
      setPoetry(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新收藏失败');
    } finally {
      setSubmitting(false);
    }
  }, [poetry]);

  const handleSubmitSuggestion = useCallback(async () => {
    if (!poetry) return;
    const trimmed = suggestionText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/poetry/${poetry.poem.id}/suggestion`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suggestionText: trimmed }),
      });
      const data = await parsePoetryResponse(response);
      setPoetry(data);
      setSuggestionText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交建议失败');
    } finally {
      setSubmitting(false);
    }
  }, [poetry, suggestionText]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="p-1 rounded-lg hover:bg-cocreator-light transition-colors"
        title="每日古诗词"
        aria-label="每日古诗词"
      >
        <PoetryIcon className="w-5 h-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[23rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#e7d7cf] bg-[#fffaf6] shadow-[0_14px_38px_rgba(94,68,58,0.14)] z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f1e3db] bg-[linear-gradient(135deg,#fff9f4_0%,#f7ede8_100%)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#a78371]">Daily Poetry</p>
                <h3 className="text-sm font-semibold text-[#4f372c]">每日古诗词</h3>
              </div>
              <button
                onClick={() => void loadCurrent()}
                className="text-xs text-[#8c6656] hover:text-[#5f4439] transition-colors"
                disabled={loading}
              >
                刷新
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {loading && !poetry ? (
              <div className="rounded-xl border border-dashed border-[#e5d2c6] px-4 py-8 text-center text-sm text-[#87675a]">
                正在翻找今天的诗页...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-[#efc1b5] bg-[#fff1ed] px-4 py-3 text-sm text-[#9a4935]">
                {error}
              </div>
            ) : poetry ? (
              <>
                <div className="rounded-2xl border border-[#ead9cf] bg-white/85 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#402e28]">{poetry.poem.title}</p>
                      <p className="mt-1 text-xs tracking-[0.18em] text-[#8f6f61]">
                        {poetry.poem.dynasty} · {poetry.poem.author}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f7eee7] px-2.5 py-1 text-[11px] text-[#8f6f61]">
                      建议 {poetry.suggestionCount}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {poemLines.map((line, index) => (
                      <p key={`${poetry.poem.id}-${index}`} className="text-[15px] leading-7 text-[#513b33]">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleNext()}
                    disabled={loading}
                    className="rounded-full bg-[#5f4439] px-3 py-1.5 text-sm text-white transition hover:bg-[#4b342c] disabled:opacity-60"
                  >
                    下一首
                  </button>
                  <button
                    onClick={() => void handleFavorite()}
                    disabled={submitting}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      poetry.isFavorite
                        ? 'bg-[#f3d8cf] text-[#7b4336] hover:bg-[#efc6b9]'
                        : 'bg-[#f3eee8] text-[#6d554a] hover:bg-[#eadfd6]'
                    } disabled:opacity-60`}
                  >
                    {poetry.isFavorite ? '已收藏' : '收藏'}
                  </button>
                  <button
                    onClick={() => setDetailOpen((value) => !value)}
                    className="rounded-full bg-[#edf2f7] px-3 py-1.5 text-sm text-[#47627b] transition hover:bg-[#dde8f2]"
                  >
                    {detailOpen ? '收起背景' : '查看背景'}
                  </button>
                </div>

                {detailOpen && (
                  <div className="space-y-3 rounded-2xl border border-[#ead9cf] bg-[#fffdfb] px-4 py-4">
                    {poetry.poem.annotation && (
                      <div>
                        <p className="text-xs font-semibold tracking-[0.16em] text-[#8f6f61]">简要背景</p>
                        <p className="mt-1 text-sm leading-6 text-[#5a443a]">{poetry.poem.annotation}</p>
                      </div>
                    )}
                    {poetry.poem.appreciation && (
                      <div>
                        <p className="text-xs font-semibold tracking-[0.16em] text-[#8f6f61]">赏析</p>
                        <p className="mt-1 text-sm leading-6 text-[#5a443a]">{poetry.poem.appreciation}</p>
                      </div>
                    )}
                    <a
                      href={poetry.poem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs text-[#8c6656] underline underline-offset-2"
                    >
                      数据来源 · {poetry.poem.sourceVersion}
                    </a>
                  </div>
                )}

                <div className="rounded-2xl border border-[#ead9cf] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#4f372c]">给这首诗提一点改进建议</p>
                      <p className="mt-1 text-xs text-[#8f6f61]">比如想补充作者背景、创作缘起，或调整卡片展示方式。</p>
                    </div>
                  </div>
                  <textarea
                    value={suggestionText}
                    onChange={(event) => setSuggestionText(event.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="写下你的建议..."
                    className="mt-3 w-full rounded-xl border border-[#e6d5ca] bg-[#fffaf7] px-3 py-2 text-sm text-[#4f372c] outline-none transition focus:border-[#d7b8a7] focus:ring-2 focus:ring-[#f1ddd2]"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-[#8f6f61]">{suggestionText.trim().length}/300</span>
                    <button
                      onClick={() => void handleSubmitSuggestion()}
                      disabled={submitting || suggestionText.trim().length === 0}
                      className="rounded-full bg-[#d98f6d] px-3 py-1.5 text-sm text-white transition hover:bg-[#c97d5b] disabled:opacity-60"
                    >
                      提交建议
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
