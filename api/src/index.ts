import type { Env, RouteHandler } from './types';
import { applyCors, handleCorsPreflight } from './middleware/cors';
import { requireAuth } from './middleware/auth';
import { logRequest } from './middleware/logging';
import { errorResponse } from './utils';
import { getViews, getSearches, getSkillViews, getReferrers } from './routes/analytics';
import { getHealth, getScanHealth, getDeployment } from './routes/health';
import { getEvents, getErrors, postEvent } from './routes/logs';
import { getScanStats, getScanQueue, postScanTrigger } from './routes/scans';
import { getSkills, getSkill, getSkillStats } from './routes/skills';
import { getExtensions, getExtension, getExtensionStats } from './routes/extensions';
import { getTrafficSummary, getTopPaths, getCountries, getHourlyTraffic, getSearchStats } from './routes/traffic';

interface Route {
  method: string;
  pattern: RegExp;
  paramKeys: string[];
  handler: RouteHandler;
  authRequired: boolean;
}

const PUBLIC_ROUTES = new Set([
  '/api/v1/extensions',
  '/api/v1/extensions/stats',
  '/api/skills',
  '/api/skills/stats',
  '/api/health',
  '/api/health/scans',
  '/api/analytics/views',
  '/api/analytics/searches',
  '/api/logs/events',
]);

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

const routes: Route[] = [
  // Public analytics endpoints (read-only aggregate stats)
  { method: 'GET', pattern: /^\/api\/analytics\/views$/, paramKeys: [], handler: getViews, authRequired: false },
  { method: 'GET', pattern: /^\/api\/analytics\/searches$/, paramKeys: [], handler: getSearches, authRequired: false },
  { method: 'GET', pattern: /^\/api\/analytics\/skills\/([^/]+)\/views$/, paramKeys: ['id'], handler: getSkillViews, authRequired: false },
  { method: 'GET', pattern: /^\/api\/analytics\/referrers$/, paramKeys: [], handler: getReferrers, authRequired: false },

  // Public health endpoints (read-only status)
  { method: 'GET', pattern: /^\/api\/health$/, paramKeys: [], handler: getHealth, authRequired: false },
  { method: 'GET', pattern: /^\/api\/health\/scans$/, paramKeys: [], handler: getScanHealth, authRequired: false },
  { method: 'GET', pattern: /^\/api\/health\/deployment$/, paramKeys: [], handler: getDeployment, authRequired: false },

  // Public logs (read-only events)
  { method: 'GET', pattern: /^\/api\/logs\/events$/, paramKeys: [], handler: getEvents, authRequired: false },
  { method: 'GET', pattern: /^\/api\/logs\/errors$/, paramKeys: [], handler: getErrors, authRequired: false },
  { method: 'POST', pattern: /^\/api\/logs\/event$/, paramKeys: [], handler: postEvent, authRequired: false },

  // Public scan stats (read-only), trigger stays protected
  { method: 'GET', pattern: /^\/api\/scans\/stats$/, paramKeys: [], handler: getScanStats, authRequired: false },
  { method: 'GET', pattern: /^\/api\/scans\/queue$/, paramKeys: [], handler: getScanQueue, authRequired: false },
  { method: 'POST', pattern: /^\/api\/scans\/trigger$/, paramKeys: [], handler: postScanTrigger, authRequired: true },

  // Public skills endpoints (read-only)
  { method: 'GET', pattern: /^\/api\/skills$/, paramKeys: [], handler: getSkills, authRequired: false },
  { method: 'GET', pattern: /^\/api\/skills\/stats$/, paramKeys: [], handler: getSkillStats, authRequired: false },
  { method: 'GET', pattern: /^\/api\/skills\/([^/]+)$/, paramKeys: ['id'], handler: getSkill, authRequired: false },

  // Extensions API (Phase 1.8 - unified skills + MCPs) - all public read-only
  { method: 'GET', pattern: /^\/api\/v1\/extensions$/, paramKeys: [], handler: getExtensions, authRequired: false },
  { method: 'GET', pattern: /^\/api\/v1\/extensions\/stats$/, paramKeys: [], handler: getExtensionStats, authRequired: false },
  { method: 'GET', pattern: /^\/api\/v1\/extensions\/([^/]+)$/, paramKeys: ['id'], handler: getExtension, authRequired: false },

  // Traffic analytics (no auth required for public stats)
  { method: 'GET', pattern: /^\/api\/traffic\/summary$/, paramKeys: [], handler: getTrafficSummary, authRequired: false },
  { method: 'GET', pattern: /^\/api\/traffic\/paths$/, paramKeys: [], handler: getTopPaths, authRequired: false },
  { method: 'GET', pattern: /^\/api\/traffic\/countries$/, paramKeys: [], handler: getCountries, authRequired: false },
  { method: 'GET', pattern: /^\/api\/traffic\/hourly$/, paramKeys: [], handler: getHourlyTraffic, authRequired: false },
  { method: 'GET', pattern: /^\/api\/traffic\/searches$/, paramKeys: [], handler: getSearchStats, authRequired: false },
];

function matchRoute(method: string, path: string): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = path.match(route.pattern);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.paramKeys.forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1]);
    });
    return { route, params };
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const corsPreflight = handleCorsPreflight(request, env);
    if (corsPreflight) return corsPreflight;

    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);
    const match = matchRoute(request.method, pathname);
    if (!match) {
      const response = applyCors(request, env, errorResponse('Not found', 404));
      // Log 404s too
      const responseTime = Date.now() - startTime;
      ctx.waitUntil(logRequest(request, response, responseTime, env, ctx));
      return response;
    }

    const isPublicRoute = PUBLIC_ROUTES.has(pathname) || !match.route.authRequired;
    if (!isPublicRoute) {
      const auth = requireAuth(request, env);
      if (auth) {
        const response = applyCors(request, env, auth);
        const responseTime = Date.now() - startTime;
        ctx.waitUntil(logRequest(request, response, responseTime, env, ctx));
        return response;
      }
    }

    try {
      const response = await match.route.handler(request, env, ctx, match.params);
      const responseTime = Date.now() - startTime;
      // Log the request (fire and forget)
      ctx.waitUntil(logRequest(request, response, responseTime, env, ctx));
      return applyCors(request, env, response);
    } catch (error) {
      // Log the real error internally but never expose it to clients
      console.error('[HANDLER_ERROR]', error instanceof Error ? error.message : error);
      const errorResp = errorResponse('Internal server error', 500);
      const responseTime = Date.now() - startTime;
      ctx.waitUntil(logRequest(request, errorResp, responseTime, env, ctx));
      return applyCors(request, env, errorResp);
    }
  },
};
