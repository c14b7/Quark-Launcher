"use strict";
/**
 * Quark Launcher - Appwrite Functions Entry Point
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const steam_api_1 = require("./steam-api");
const auth_api_1 = require("./auth-api");
const friends_api_1 = require("./friends-api");
const telemetry_api_1 = require("./telemetry-api");
const chat_api_1 = require("./chat-api");
const stats_api_1 = require("./stats-api");
const spotify_api_1 = require("./spotify-api");
const middleware_1 = require("./lib/middleware");
const config_1 = require("./lib/config");
const telemetry_schema_1 = require("./lib/telemetry-schema");
const runtime_1 = require("./lib/runtime");
async function default_1({ req, res, log, error }) {
    const logger = (0, runtime_1.createLogger)(log, error);
    // Prefer Appwrite path/xpath; fall back to body._route (client always sends it on POST).
    const body = (0, middleware_1.parseBody)(req);
    const fromReq = (0, middleware_1.resolveRoutePathFromRequest)(req);
    const fromBody = typeof body._route === 'string' ? String(body._route).split('?')[0] : '';
    const path = fromReq && fromReq !== '/'
        ? fromReq
        : fromBody
            ? fromBody.startsWith('/')
                ? fromBody
                : `/${fromBody}`
            : '/';
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
            const telemetrySchema = await (0, telemetry_schema_1.getTelemetrySchemaStatus)();
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
            return (0, auth_api_1.handleAuthApiRequest)(req, res, logger);
        }
        if (path.startsWith('/friends')) {
            return (0, friends_api_1.handleFriendsApiRequest)(req, res, logger);
        }
        if (path.startsWith('/steam')) {
            return (0, steam_api_1.handleSteamApiRequest)(req, res, logger);
        }
        if (path.startsWith('/chat')) {
            return (0, chat_api_1.handleChatApiRequest)(req, res, logger);
        }
        if (path.startsWith('/telemetry')) {
            return (0, telemetry_api_1.handleTelemetryApiRequest)(req, res, logger);
        }
        if (path.startsWith('/stats')) {
            return (0, stats_api_1.handleStatsApiRequest)(req, res, logger);
        }
        if (path.startsWith('/spotify')) {
            return (0, spotify_api_1.handleSpotifyApiRequest)(req, res, logger);
        }
        logger.log(`Unknown route: ${path}`);
        return res.json({
            success: false,
            code: 'NOT_FOUND',
            error: `Unknown route: ${path || '/'}`,
            version: '2.2.0',
            endpoints: ['/auth', '/friends', '/chat', '/steam', '/telemetry', '/stats', '/spotify', '/health'],
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
