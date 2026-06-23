/**
 * Quark Launcher - Appwrite Functions Entry Point
 */

import { handleSteamApiRequest } from './steam-api';
import { handleAuthApiRequest } from './auth-api';
import { handleFriendsApiRequest } from './friends-api';
import { parseBody, resolveRoutePath } from './lib/middleware';
import { APPWRITE_API_KEY } from './lib/config';
import { createLogger, formatError, type FunctionContext } from './lib/runtime';

export default async function ({ req, res, log, error }: FunctionContext) {
  const logger = createLogger(log, error);
  const path = resolveRoutePath(req, parseBody(req));
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
      return res.json({
        success: true,
        version: '2.0.1',
        apiKeyConfigured: true,
        path,
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

    logger.log(`Unknown route: ${path}`);
    return res.json({
      success: false,
      code: 'NOT_FOUND',
      error: `Unknown route: ${path || '/'}`,
      version: '2.0.1',
      endpoints: ['/auth', '/friends', '/steam', '/health'],
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
