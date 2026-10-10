/**
 * Quark Launcher - Appwrite Functions Entry Point
 */

import { handleSteamApiRequest } from './steam-api';
import { handleAuthApiRequest } from './auth-api';
import { handleFriendsApiRequest } from './friends-api';
import { handleTelemetryApiRequest } from './telemetry-api';
import { handleChatApiRequest } from './chat-api';
import { handleStatsApiRequest } from './stats-api';
import { handleSpotifyApiRequest } from './spotify-api';
import { parseBody, resolveRoutePathFromRequest } from './lib/middleware';
import { APPWRITE_API_KEY } from './lib/config';
import { getTelemetrySchemaStatus } from './lib/telemetry-schema';
import { createLogger, formatError, type FunctionContext } from './lib/runtime';

export default async function ({ req, res, log, error }: FunctionContext) {
  const logger = createLogger(log, error);
  // Prefer Appwrite path/xpath; fall back to body._route (client always sends it on POST).
  const body = parseBody(req);
  const fromReq = resolveRoutePathFromRequest(req);
  const fromBody = typeof body._route === 'string' ? String(body._route).split('?')[0] : '';
  const path =
    fromReq && fromReq !== '/'
      ? fromReq
      : fromBody
        ? fromBody.startsWith('/')
          ? fromBody
          : `/${fromBody}`
        : '/';
  const method = (req.method || 'POST').toUpperCase();

  logger.log(`${method} ${path} (raw path: ${req.path || 'empty'})`);

  try {
    if (!APPWRITE_API_KEY) {
      logger.error('APPWRITE_API_KEY is not set in function environment');
      return res.json({
        success: false,
        code: 'CONFIG_ERROR',
        error: 'Server misconfigured: APPWRITE_API_KEY missing',
      }, 500);
    }

    if (path === '/health' && method === 'GET') {
      const telemetrySchema = await getTelemetrySchemaStatus();
      return res.json({
        success: true,
        version: '2.2.0',
        apiKeyConfigured: true,
        path,
        telemetrySchema,
        endpoints: ['/auth', '/friends', '/chat', '/steam', '/telemetry', '/stats', '/spotify', '/health'],
      });
    }

    if (path.startsWith('/auth')) {
      return handleAuthApiRequest(req, res, logger);
    }

    if (path.startsWith('/friends')) {
      return handleFriendsApiRequest(req, res, logger);
    }

    if (path.startsWith('/steam')) {
      return handleSteamApiRequest(req, res, logger);
    }

    if (path.startsWith('/chat')) {
      return handleChatApiRequest(req, res, logger);
    }

    if (path.startsWith('/telemetry')) {
      return handleTelemetryApiRequest(req, res, logger);
    }

    if (path.startsWith('/stats')) {
      return handleStatsApiRequest(req, res, logger);
    }

    if (path.startsWith('/spotify')) {
      return handleSpotifyApiRequest(req, res, logger);
    }

    logger.log(`Unknown route: ${path}`);
    return res.json({
      success: false,
      code: 'NOT_FOUND',
      error: `Unknown route: ${path || '/'}`,
      version: '2.2.0',
      endpoints: ['/auth', '/friends', '/chat', '/steam', '/telemetry', '/stats', '/spotify', '/health'],
    }, 404);
  } catch (err) {
    logger.error(`Fatal router error: ${formatError(err)}`);
    return res.json({
      success: false,
      code: 'INTERNAL_ERROR',
      error: 'Function crashed',
    }, 500);
  }
}
