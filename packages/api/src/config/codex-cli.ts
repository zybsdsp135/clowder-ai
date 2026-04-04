/**
 * Codex CLI Runtime Config
 * Centralized parsing for Codex sandbox/approval settings.
 */

export const CODEX_SANDBOX_MODES = ['read-only', 'workspace-write', 'danger-full-access'] as const;
export type CodexSandboxMode = (typeof CODEX_SANDBOX_MODES)[number];

export const CODEX_APPROVAL_POLICIES = ['untrusted', 'on-failure', 'on-request', 'never'] as const;
export type CodexApprovalPolicy = (typeof CODEX_APPROVAL_POLICIES)[number];

export const DEFAULT_CODEX_SANDBOX_MODE: CodexSandboxMode = 'danger-full-access';
export const DEFAULT_CODEX_APPROVAL_POLICY: CodexApprovalPolicy = 'on-request';
export const DEFAULT_CODEX_DISTINCT_PERSONAS = true;

function parseEnum<T extends readonly string[]>(raw: string | undefined, valid: T, fallback: T[number]): T[number] {
  if (!raw) return fallback;
  const normalized = raw.trim();
  if (normalized.length === 0) return fallback;
  return (valid as readonly string[]).includes(normalized) ? (normalized as T[number]) : fallback;
}

export function getCodexSandboxMode(env: NodeJS.ProcessEnv = process.env): CodexSandboxMode {
  return parseEnum(env.CAT_CODEX_SANDBOX_MODE, CODEX_SANDBOX_MODES, DEFAULT_CODEX_SANDBOX_MODE);
}

export function getCodexApprovalPolicy(env: NodeJS.ProcessEnv = process.env): CodexApprovalPolicy {
  return parseEnum(env.CAT_CODEX_APPROVAL_POLICY, CODEX_APPROVAL_POLICIES, DEFAULT_CODEX_APPROVAL_POLICY);
}

export function isCodexDistinctPersonasEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.CAT_CODEX_DISTINCT_PERSONAS?.trim().toLowerCase();
  if (!raw) return DEFAULT_CODEX_DISTINCT_PERSONAS;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return DEFAULT_CODEX_DISTINCT_PERSONAS;
}
