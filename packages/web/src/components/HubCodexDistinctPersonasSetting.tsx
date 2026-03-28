'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api-client';

export function HubCodexDistinctPersonasSetting({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(initialValue);
  }, [initialValue]);

  const toggle = async () => {
    const nextValue = !enabled;
    setSaving(true);
    setError(null);
    setEnabled(nextValue);
    try {
      const res = await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'codex.execution.distinctPersonas',
          value: nextValue,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error((payload.error as string) ?? `保存失败 (${res.status})`);
      }
    } catch (err) {
      setEnabled(!nextValue);
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[#CFE5D5] bg-[#F5FBF6] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#3D2E22]">多猫同 Codex 时保留个体人格</p>
          <p className="text-xs leading-5 text-[#6C7A6D]">
            仅影响走 Codex/OpenAI 的猫。开启后，会为布偶猫、缅因猫、暹罗猫注入各自独立的思考视角和互动姿态；关闭后继续沿用原来的 provider 行为。
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-label="切换 Codex 个体人格模式"
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            enabled ? 'bg-[#77A777]' : 'bg-[#D7C8BC]'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="text-[11px] leading-4 text-[#8A776B]">
        当前状态：{enabled ? '已开启，仅在 Codex 路径生效' : '已关闭，保持旧逻辑'}
      </p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
