import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import Database from 'better-sqlite3';
import Fastify from 'fastify';

const AUTH_HEADERS = { 'x-cat-cafe-user': 'poetry-user' };

async function loadPoetryModules() {
  try {
    const [{ PoetryStore }, { poetryRoutes }] = await Promise.all([
      import('../dist/domains/poetry/PoetryStore.js'),
      import('../dist/routes/poetry.js'),
    ]);
    return { PoetryStore, poetryRoutes };
  } catch {
    const [{ PoetryStore }, { poetryRoutes }] = await Promise.all([
      import('../src/domains/poetry/PoetryStore.ts'),
      import('../src/routes/poetry.ts'),
    ]);
    return { PoetryStore, poetryRoutes };
  }
}

async function createApp() {
  const { PoetryStore, poetryRoutes } = await loadPoetryModules();
  const app = Fastify();
  const db = new Database(':memory:');
  const poetryStore = new PoetryStore(db);
  await app.register(poetryRoutes, { poetryStore });
  await app.ready();
  return { app, db };
}

describe('poetry routes', () => {
  test('GET /api/poetry/today returns a poem and enforces header identity', async () => {
    const { app, db } = await createApp();
    try {
      const missingIdentity = await app.inject({ method: 'GET', url: '/api/poetry/today' });
      assert.equal(missingIdentity.statusCode, 401);

      const first = await app.inject({
        method: 'GET',
        url: '/api/poetry/today',
        headers: AUTH_HEADERS,
      });
      const second = await app.inject({
        method: 'GET',
        url: '/api/poetry/today',
        headers: { 'x-cat-cafe-user': 'another-user' },
      });

      assert.equal(first.statusCode, 200);
      assert.equal(second.statusCode, 200);
      assert.ok(first.json().poem.id);
      assert.equal(first.json().poem.id, second.json().poem.id);
    } finally {
      db.close();
      await app.close();
    }
  });

  test('POST /api/poetry/next returns a different poem when currentPoemId is provided', async () => {
    const { app, db } = await createApp();
    try {
      const today = await app.inject({
        method: 'GET',
        url: '/api/poetry/today',
        headers: AUTH_HEADERS,
      });
      const currentPoemId = today.json().poem.id;

      const next = await app.inject({
        method: 'POST',
        url: '/api/poetry/next',
        headers: { ...AUTH_HEADERS, 'content-type': 'application/json' },
        payload: JSON.stringify({ currentPoemId }),
      });

      assert.equal(next.statusCode, 200);
      assert.notEqual(next.json().poem.id, currentPoemId);
    } finally {
      db.close();
      await app.close();
    }
  });

  test('detail, favorite and suggestion endpoints update poem state', async () => {
    const { app, db } = await createApp();
    try {
      const today = await app.inject({
        method: 'GET',
        url: '/api/poetry/today',
        headers: AUTH_HEADERS,
      });
      const poemId = today.json().poem.id;

      const detail = await app.inject({
        method: 'GET',
        url: `/api/poetry/${poemId}/detail`,
        headers: AUTH_HEADERS,
      });
      assert.equal(detail.statusCode, 200);
      assert.equal(detail.json().poem.id, poemId);

      const favorite = await app.inject({
        method: 'POST',
        url: `/api/poetry/${poemId}/favorite`,
        headers: AUTH_HEADERS,
      });
      assert.equal(favorite.statusCode, 200);
      assert.equal(favorite.json().isFavorite, true);

      const unfavorite = await app.inject({
        method: 'DELETE',
        url: `/api/poetry/${poemId}/favorite`,
        headers: AUTH_HEADERS,
      });
      assert.equal(unfavorite.statusCode, 200);
      assert.equal(unfavorite.json().isFavorite, false);

      const suggestion = await app.inject({
        method: 'POST',
        url: `/api/poetry/${poemId}/suggestion`,
        headers: { ...AUTH_HEADERS, 'content-type': 'application/json' },
        payload: JSON.stringify({ suggestionText: '可以补一段更详细的写作背景。' }),
      });
      assert.equal(suggestion.statusCode, 201);
      assert.ok(suggestion.json().suggestionId);
      assert.equal(suggestion.json().suggestionCount, 1);
    } finally {
      db.close();
      await app.close();
    }
  });

  test('POST /api/poetry/:id/suggestion validates body length', async () => {
    const { app, db } = await createApp();
    try {
      const bad = await app.inject({
        method: 'POST',
        url: '/api/poetry/poem-jing-ye-si/suggestion',
        headers: { ...AUTH_HEADERS, 'content-type': 'application/json' },
        payload: JSON.stringify({ suggestionText: '' }),
      });
      assert.equal(bad.statusCode, 400);
    } finally {
      db.close();
      await app.close();
    }
  });
});
