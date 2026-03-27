import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveHeaderUserId } from '../utils/request-identity.js';
import type { Poem, PoetryStore } from '../domains/poetry/PoetryStore.js';

const nextBodySchema = z.object({
  currentPoemId: z.string().trim().min(1).optional(),
});

const suggestionBodySchema = z.object({
  suggestionText: z.string().trim().min(1).max(300),
});

interface PoetryPayload {
  poem: Poem;
  isFavorite: boolean;
  suggestionCount: number;
}

export interface PoetryRouteOptions {
  poetryStore: PoetryStore;
}

async function buildPayload(poetryStore: PoetryStore, userId: string, poem: Poem): Promise<PoetryPayload> {
  const [isFavorite, suggestionCount] = await Promise.all([
    poetryStore.isFavorite(userId, poem.id),
    poetryStore.getSuggestionCount(poem.id),
  ]);

  return {
    poem,
    isFavorite,
    suggestionCount,
  };
}

function requireUserId(request: FastifyRequest): string | null {
  return resolveHeaderUserId(request);
}

export const poetryRoutes: FastifyPluginAsync<PoetryRouteOptions> = async (app, { poetryStore }) => {
  app.get('/api/poetry/today', async (request, reply) => {
    const userId = requireUserId(request);
    if (!userId) {
      reply.status(401);
      return { error: 'Identity required (X-Cat-Cafe-User header)' };
    }

    const poem = await poetryStore.getTodayPoem();
    if (!poem) {
      reply.status(404);
      return { error: 'No poems available' };
    }

    return buildPayload(poetryStore, userId, poem);
  });

  app.post('/api/poetry/next', async (request, reply) => {
    const userId = requireUserId(request);
    if (!userId) {
      reply.status(401);
      return { error: 'Identity required (X-Cat-Cafe-User header)' };
    }

    const parsed = nextBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.status(400);
      return { error: 'Invalid body', details: parsed.error.issues };
    }

    const poem = await poetryStore.getNextPoem(userId, parsed.data.currentPoemId ?? null);
    if (!poem) {
      reply.status(404);
      return { error: 'No poems available' };
    }

    return buildPayload(poetryStore, userId, poem);
  });

  app.get('/api/poetry/:id/detail', async (request, reply) => {
    const userId = requireUserId(request);
    if (!userId) {
      reply.status(401);
      return { error: 'Identity required (X-Cat-Cafe-User header)' };
    }

    const params = request.params as { id?: string };
    const poemId = params.id?.trim();
    if (!poemId) {
      reply.status(400);
      return { error: 'Poem id required' };
    }

    const poem = await poetryStore.getPoemById(poemId);
    if (!poem) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    return buildPayload(poetryStore, userId, poem);
  });

  app.post('/api/poetry/:id/favorite', async (request, reply) => {
    const userId = requireUserId(request);
    if (!userId) {
      reply.status(401);
      return { error: 'Identity required (X-Cat-Cafe-User header)' };
    }

    const params = request.params as { id?: string };
    const poemId = params.id?.trim();
    if (!poemId) {
      reply.status(400);
      return { error: 'Poem id required' };
    }

    const ok = await poetryStore.setFavorite(userId, poemId, true);
    if (!ok) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    const poem = await poetryStore.getPoemById(poemId);
    if (!poem) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    return buildPayload(poetryStore, userId, poem);
  });

  app.delete('/api/poetry/:id/favorite', async (request, reply) => {
    const userId = requireUserId(request);
    if (!userId) {
      reply.status(401);
      return { error: 'Identity required (X-Cat-Cafe-User header)' };
    }

    const params = request.params as { id?: string };
    const poemId = params.id?.trim();
    if (!poemId) {
      reply.status(400);
      return { error: 'Poem id required' };
    }

    const ok = await poetryStore.setFavorite(userId, poemId, false);
    if (!ok) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    const poem = await poetryStore.getPoemById(poemId);
    if (!poem) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    return buildPayload(poetryStore, userId, poem);
  });

  app.post('/api/poetry/:id/suggestion', async (request, reply) => {
    const userId = requireUserId(request);
    if (!userId) {
      reply.status(401);
      return { error: 'Identity required (X-Cat-Cafe-User header)' };
    }

    const params = request.params as { id?: string };
    const poemId = params.id?.trim();
    if (!poemId) {
      reply.status(400);
      return { error: 'Poem id required' };
    }

    const parsed = suggestionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { error: 'Invalid body', details: parsed.error.issues };
    }

    const suggestion = await poetryStore.addSuggestion(userId, poemId, parsed.data.suggestionText);
    if (!suggestion) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    const poem = await poetryStore.getPoemById(poemId);
    if (!poem) {
      reply.status(404);
      return { error: 'Poem not found' };
    }

    reply.status(201);
    return {
      ...(await buildPayload(poetryStore, userId, poem)),
      suggestionId: suggestion.id,
    };
  });
};
