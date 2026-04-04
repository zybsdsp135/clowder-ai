import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { CAT_CONFIGS, catRegistry } from '@cat-cafe/shared';

const { buildStaticIdentity } = await import('../dist/domains/cats/services/context/SystemPromptBuilder.js');

function restoreBuiltins() {
  catRegistry.reset();
  for (const [id, config] of Object.entries(CAT_CONFIGS)) {
    catRegistry.register(id, config);
  }
}

function resetRegistry() {
  catRegistry.reset();
}

describe('buildStaticIdentity codex distinct personas', () => {
  afterEach(() => {
    delete process.env.CAT_CODEX_DISTINCT_PERSONAS;
    restoreBuiltins();
  });

  it('injects breed-specific individuality protocol only for openai cats when enabled', () => {
    process.env.CAT_CODEX_DISTINCT_PERSONAS = 'true';
    resetRegistry();
    catRegistry.register('opus', {
      ...CAT_CONFIGS.opus,
      provider: 'openai',
      defaultModel: 'gpt-5.4',
    });

    const prompt = buildStaticIdentity('opus');
    assert.match(prompt, /个体人格协议（Codex 多猫模式）/);
    assert.match(prompt, /你是布偶猫\/宪宪/);
    assert.match(prompt, /不要借用缅因猫的审稿口吻/);
  });

  it('keeps original prompt when the global switch is disabled', () => {
    process.env.CAT_CODEX_DISTINCT_PERSONAS = 'false';
    resetRegistry();
    catRegistry.register('opus', {
      ...CAT_CONFIGS.opus,
      provider: 'openai',
      defaultModel: 'gpt-5.4',
    });

    const prompt = buildStaticIdentity('opus');
    assert.doesNotMatch(prompt, /个体人格协议（Codex 多猫模式）/);
  });
  it('lets member-level codex persona settings override the global fallback', () => {
    process.env.CAT_CODEX_DISTINCT_PERSONAS = 'false';
    resetRegistry();
    catRegistry.register('opus', {
      ...CAT_CONFIGS.opus,
      provider: 'openai',
      defaultModel: 'gpt-5.4',
      codex: {
        personaMode: 'strong',
        identityIsolation: 'neutral-root',
        personaPrompt: '回答时优先保持布偶猫的带路感。',
      },
    });

    const prompt = buildStaticIdentity('opus');
    assert.match(prompt, /个体人格协议（Codex 多猫模式）/);
    assert.match(prompt, /回答时优先保持布偶猫的带路感。/);
  });
});
