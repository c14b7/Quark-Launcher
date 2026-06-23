"use strict";
/**
 * Quark Launcher - Appwrite Functions Entry Point
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const steam_api_1 = require("./steam-api");
const auth_api_1 = require("./auth-api");
const friends_api_1 = require("./friends-api");
const middleware_1 = require("./lib/middleware");
const config_1 = require("./lib/config");
const runtime_1 = require("./lib/runtime");
async function default_1({ req, res, log, error }) {
    const logger = (0, runtime_1.createLogger)(log, error);
    const path = (0, middleware_1.resolveRoutePath)(req, (0, middleware_1.parseBody)(req));
    const method = (req.method || 'POST').toUpperCase();
    logger.log(`${method} ${path} (raw path: ${req.path || 'empty'})`);
    try {
        if (!config_1.APPWRITE_API_KEY) {
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
            return (0, auth_api_1.handleAuthApiRequest)(req, res, logger);
        }
        if (path.startsWith('/friends')) {
            return (0, friends_api_1.handleFriendsApiRequest)(req, res, logger);
        }
        if (path.startsWith('/steam')) {
            return (0, steam_api_1.handleSteamApiRequest)(req, res, logger);
        }
        logger.log(`Unknown route: ${path}`);
        return res.json({
            success: false,
            code: 'NOT_FOUND',
            error: `Unknown route: ${path || '/'}`,
            version: '2.0.1',
            endpoints: ['/auth', '/friends', '/steam', '/health'],
        }, 404);
    }
    catch (err) {
        logger.error(`Fatal router error: ${(0, runtime_1.formatError)(err)}`);
        return res.json({
            success: false,
            code: 'INTERNAL_ERROR',
            error: 'Function crashed',
        }, 500);
    }
}
