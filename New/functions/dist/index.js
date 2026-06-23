"use strict";
/**
 * Quark Launcher - Appwrite Functions Entry Point
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const steam_api_1 = require("./steam-api");
const auth_api_1 = require("./auth-api");
const friends_api_1 = require("./friends-api");
async function default_1(req, res) {
    const path = req.path || '';
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
        success: true,
        message: 'Quark Launcher API',
        version: '2.0.0',
        endpoints: ['/auth', '/friends', '/steam'],
    });
}
