import { jsonResponse } from '../utils';
import type { Env } from '../types';

function parseOrigins(env: Env): Set<string> {
  const raw = env.CORS_ORIGINS || '';
  const items = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  return new Set(items);
}

export function applyCors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('origin');
  const allowed = parseOrigins(env);
  const headers = new Headers(response.headers);

  if (origin && (allowed.has(origin) || allowed.has('*'))) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
    headers.set('access-control-allow-credentials', 'true');
  }

  headers.set('access-control-allow-headers', 'content-type, authorization, x-api-key');
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-max-age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleCorsPreflight(request: Request, env: Env): Response | null {
  if (request.method !== 'OPTIONS') return null;
  const origin = request.headers.get('origin');
  const allowed = parseOrigins(env);
  if (!origin || (!allowed.has(origin) && !allowed.has('*'))) {
    return jsonResponse({ ok: false, error: 'CORS not allowed' }, { status: 403 });
  }
  return applyCors(request, env, new Response(null, { status: 204 }));
}
