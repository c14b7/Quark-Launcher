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
async function default_1(req, res) {
    const path = (0, middleware_1.resolveRoutePath)(req, (0, middleware_1.parseBody)(req));
    if (path.startsWith('/auth')) {
        return (0, auth_api_1.handleAuthApiRequest)(req, res);
    }
    if (path.startsWith('/friends')) {
        return (0, friends_api_1.handleFriendsApiRequest)(req, res);
    }
    if (path.startsWith('/steam')) {
        return (0, steam_api_1.handleSteamApiRequest)(req, res);
    }
    return res.json({
        success: false,
        code: 'NOT_FOUND',
        error: `Unknown route: ${path || '/'}`,
        version: '2.0.0',
        endpoints: ['/auth', '/friends', '/steam'],
    }, 404);
}
