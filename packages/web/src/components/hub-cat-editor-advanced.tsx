'use client';

import type { CatData } from '@/hooks/useCatData';
import {
  CODEX_APPROVAL_OPTIONS,
  CODEX_AUTH_MODE_OPTIONS,
  CODEX_IDENTITY_ISOLATION_OPTIONS,
  CODEX_PERSONA_MODE_OPTIONS,
  CODEX_SANDBOX_OPTIONS,
  type CodexRuntimeSettings,
  type HubCatEditorFormState,
  SESSION_CHAIN_OPTIONS,
  SESSION_STRATEGY_OPTIONS,
  type StrategyFormState,
} from './hub-cat-editor.model';
import { RangeField, SectionCard, SelectField, TextAreaField, TextField } from './hub-cat-editor-fields';
import { TagEditor } from './hub-tag-editor';

type FormPatch = Partial<HubCatEditorFormState>;

export function AdvancedRuntimeSection({
  cat,
  form,
  strategyForm,
  loadingStrategy,
  strategyError,
  codexSettings,
  loadingCodexSettings,
  codexSettingsError,
  codexSettingsEditable,
  showCodexSettings,
  onChange,
  onStrategyChange,
  onCodexChange,
}: {
  cat?: CatData | null;
  form: HubCatEditorFormState;
  strategyForm: StrategyFormState | null;
  loadingStrategy: boolean;
  strategyError: string | null;
  codexSettings: CodexRuntimeSettings | null;
  loadingCodexSettings: boolean;
  codexSettingsError: string | null;
  codexSettingsEditable: boolean;
  showCodexSettings: boolean;
  onChange: (patch: FormPatch) => void;
  onStrategyChange: (patch: Partial<StrategyFormState>) => void;
  onCodexChange: (patch: Partial<CodexRuntimeSettings>) => void;
}) {
  const effectiveCodexSettings = codexSettings ?? {
    sandboxMode: 'workspace-write' as const,
    approvalPolicy: 'on-request' as const,
    authMode: 'oauth' as const,
  };

  return (
    <SectionCard
      title="高级运行时参数"
      description="contextBudget + Session 策略 + Client 运行参数。Codex 的专属策略只会在选择 Codex Client 时显示。"
      tone="success"
    >
      <p className="text-xs leading-5 text-[#6C7A6D]">
        如需调整该成员的上下文预算，请保持 4 项要么全部留空，要么全部填写，避免只填一部分。
      </p>
      <div className="space-y-2">
        <TextField
          label="Max Prompt Tokens"
          value={form.maxPromptTokens}
          onChange={(value) => onChange({ maxPromptTokens: value })}
          inputMode="numeric"
          tone="success"
          placeholder="例如 48000"
        />
        <TextField
          label="Max Context Tokens"
          value={form.maxContextTokens}
          onChange={(value) => onChange({ maxContextTokens: value })}
          inputMode="numeric"
          tone="success"
          placeholder="例如 128000"
        />
        <TextField
          label="Max Messages"
          value={form.maxMessages}
          onChange={(value) => onChange({ maxMessages: value })}
          inputMode="numeric"
          tone="success"
          placeholder="例如 50"
        />
        <TextField
          label="Max Content Length Per Msg"
          ariaLabel="Max Content Length Per Msg"
          value={form.maxContentLengthPerMsg}
          onChange={(value) => onChange({ maxContentLengthPerMsg: value })}
          inputMode="numeric"
          tone="success"
          placeholder="例如 16000"
        />
        <SelectField
          label="Session Chain"
          value={form.sessionChain}
          options={SESSION_CHAIN_OPTIONS}
          onChange={(value) => onChange({ sessionChain: value as HubCatEditorFormState['sessionChain'] })}
          tone="success"
        />
        {form.client === 'openai' || form.client === 'opencode' ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#3D2E22]">额外 CLI 参数</p>
            <TagEditor
              tags={form.cliConfigArgs}
              onChange={(nextTags) => onChange({ cliConfigArgs: nextTags })}
              addLabel="+ 添加参数"
              placeholder={
                form.client === 'opencode' ? '例如 --variant low' : '例如 --config model_reasoning_effort="low"'
              }
              emptyLabel="暂无额外参数"
              tone="green"
            />
            <p className="text-[11px] leading-4 text-[#8A776B]">
              每一项会直接追加到 CLI 命令行末尾，请确认参数格式符合
              {form.client === 'opencode' ? (
                <a href="https://opencode.ai/docs/cli" target="_blank" rel="noreferrer" className="underline">
                  OpenCode CLI
                </a>
              ) : (
                <a href="https://github.com/openai/codex" target="_blank" rel="noreferrer" className="underline">
                  Codex CLI
                </a>
              )}
            </p>
          </div>
        ) : null}
        {form.client === 'openai' ? (
          <div className="space-y-2 rounded-2xl border border-[#CFE5D5] bg-[#F5FBF6] p-4">
            <p className="text-sm font-semibold text-[#3D2E22]">Codex 猫味策略</p>
            <p className="text-[11px] leading-4 text-[#6C7A6D]">
              这组设置只影响这只猫在调用 Codex CLI 时保留多少个性，以及是否隔离仓库根目录的人格提示。
            </p>
            <SelectField
              label="猫味强度"
              ariaLabel="Codex Persona Mode"
              value={form.codexPersonaMode ?? 'balanced'}
              options={CODEX_PERSONA_MODE_OPTIONS}
              onChange={(value) =>
                onChange({ codexPersonaMode: value as HubCatEditorFormState['codexPersonaMode'] })
              }
              tone="success"
            />
            <p className="text-[11px] leading-4 text-[#6C7A6D]">
              关闭猫味 = 像普通 Codex 助手；平衡 = 保留视角差异但不过度表演；明显保留猫味 = 更强调角色口吻和互动姿态。
            </p>
            <SelectField
              label="仓库人格隔离"
              ariaLabel="Codex Identity Isolation"
              value={form.codexIdentityIsolation ?? 'inherit-repo'}
              options={CODEX_IDENTITY_ISOLATION_OPTIONS}
              onChange={(value) =>
                onChange({ codexIdentityIsolation: value as HubCatEditorFormState['codexIdentityIsolation'] })
              }
              tone="success"
            />
            <p className="text-[11px] leading-4 text-[#6C7A6D]">
              继承仓库人格 = 继续接受仓库根目录 `AGENTS.md` 的提示影响；隔离仓库人格 = 尽量用中性工作根启动，避免多只猫都被仓库提示压成同一种口吻。
            </p>
            <TextAreaField
              label="补充人格提示"
              ariaLabel="Codex Persona Prompt"
              value={form.codexPersonaPrompt ?? ''}
              onChange={(value) => onChange({ codexPersonaPrompt: value })}
              tone="success"
              placeholder="可选，补充这只猫在 Codex 模式下的视角、语气或互动边界。"
            />
          </div>
        ) : null}
      </div>

      {cat ? (
        <div className="space-y-3 rounded-2xl border border-[#DCE9E0] bg-cafe-surface/80 p-4">
          {loadingStrategy ? <p className="text-sm text-[#7F7168]">Session 策略加载中...</p> : null}
          {strategyError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{strategyError}</p>
          ) : null}
          {strategyForm ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#CFE5D5] bg-[#F5FBF6] px-4 py-3 text-xs leading-5 text-[#6C7A6D]">
                阈值单位是 context 占用率 = 当前 tokens / Max Context Tokens，取值范围建议填写小数百分比。
              </div>
              <div className="space-y-2">
                <SelectField
                  label="Session Strategy"
                  value={strategyForm.strategy}
                  options={SESSION_STRATEGY_OPTIONS.filter(
                    (option) => option.value !== 'hybrid' || strategyForm.hybridCapable,
                  )}
                  onChange={(value) => onStrategyChange({ strategy: value as StrategyFormState['strategy'] })}
                  tone="success"
                />
                <RangeField
                  label="Session Warn Threshold"
                  value={strategyForm.warnThreshold}
                  onChange={(value) => onStrategyChange({ warnThreshold: value })}
                  hint="context 占用率达到该比例时，先提示但不立即切换策略。"
                />
                <RangeField
                  label="Session Action Threshold"
                  value={strategyForm.actionThreshold}
                  onChange={(value) => onStrategyChange({ actionThreshold: value })}
                  hint="context 占用率达到该比例时，Session 策略会自动执行 handoff 或压缩。"
                />
                {strategyForm.strategy === 'hybrid' ? (
                  <TextField
                    label="Max Compressions"
                    value={strategyForm.maxCompressions}
                    onChange={(value) => onStrategyChange({ maxCompressions: value })}
                    inputMode="numeric"
                    tone="success"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showCodexSettings ? (
        <div className="space-y-3 rounded-2xl border border-[#DCE9E0] bg-cafe-surface/80 p-4">
          {loadingCodexSettings ? <p className="text-sm text-[#7F7168]">Codex 运行参数加载中...</p> : null}
          {codexSettingsError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{codexSettingsError}</p>
          ) : null}
          {!loadingCodexSettings && !codexSettingsEditable ? (
            <p className="rounded-xl border border-[#F5D2B8] bg-[#FFF4EC] px-3 py-2 text-xs leading-5 text-[#C27D52]">
              Codex 配置基线未加载成功，这 3 项暂时只展示默认值。请刷新后重试，否则保存时不会写入全局配置。
            </p>
          ) : null}
          <p className="text-center text-xs font-semibold text-[#B59A88]">—— Codex 全局运行参数（影响所有 Codex 成员）——</p>
          <p className="rounded-xl border border-[#CFE5D5] bg-[#F5FBF6] px-3 py-2 text-xs leading-5 text-[#6C7A6D]">
            这 3 项不是某一只猫自己的性格设置，而是整个项目所有 Codex 成员共用的底层运行方式。
          </p>
          <div className="space-y-2">
            <SelectField
              label="文件权限"
              ariaLabel="Codex Sandbox"
              value={effectiveCodexSettings.sandboxMode}
              options={CODEX_SANDBOX_OPTIONS}
              onChange={(value) => onCodexChange({ sandboxMode: value as CodexRuntimeSettings['sandboxMode'] })}
              disabled={!codexSettingsEditable}
              tone="success"
            />
            <p className="text-[11px] leading-4 text-[#6C7A6D]">
              只读 = 只能查看；工作区可写 = 可改当前项目；完全访问 = 权限最大，适合需要安装依赖或跨目录操作的场景。
            </p>
            <SelectField
              label="危险操作确认"
              ariaLabel="Codex Approval"
              value={effectiveCodexSettings.approvalPolicy}
              options={CODEX_APPROVAL_OPTIONS}
              onChange={(value) => onCodexChange({ approvalPolicy: value as CodexRuntimeSettings['approvalPolicy'] })}
              disabled={!codexSettingsEditable}
              tone="success"
            />
            <p className="text-[11px] leading-4 text-[#6C7A6D]">
              控制 Codex 在执行命令前要不要额外确认。越往下越自动化，也越需要你信任当前环境。
            </p>
            <SelectField
              label="鉴权方式"
              ariaLabel="Codex Auth Mode"
              value={effectiveCodexSettings.authMode}
              options={CODEX_AUTH_MODE_OPTIONS}
              onChange={(value) => onCodexChange({ authMode: value as CodexRuntimeSettings['authMode'] })}
              disabled={!codexSettingsEditable}
              tone="success"
            />
            <p className="text-[11px] leading-4 text-[#6C7A6D]">
              CLI 订阅登录 = 走你本机已登录的 Codex 账号；API Key = 走 OpenAI Key；自动选择 = 让系统自行判断。
            </p>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
