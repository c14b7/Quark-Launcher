"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBody = parseBody;
exports.resolveRoutePathFromRequest = resolveRoutePathFromRequest;
exports.resolveRoutePath = resolveRoutePath;
exports.stripRouteMeta = stripRouteMeta;
exports.getHeaders = getHeaders;
exports.getClientIp = getClientIp;
exports.extractAuth = extractAuth;
exports.verifyAuth = verifyAuth;
exports.jsonResponse = jsonResponse;
exports.errorResponse = errorResponse;
exports.requireAuth = requireAuth;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./config");
function parseBody(req) {
    // bodyJson is a getter that throws on empty GET bodies — never read it bare
    try {
        const json = req.bodyJson;
        if (json && typeof json === 'object' && !Array.isArray(json)) {
            return json;
        }
    }
    catch {
        // empty body (typical for GET)
    }
    const raw = req.payload || req.body || req.bodyRaw || req.bodyText;
    if (!raw || (typeof raw === 'string' && raw.trim() === '')) {
        return {};
    }
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
    catch {
        return {};
    }
}
/** Safe path resolution without parsing body (for GET requests). */
function resolveRoutePathFromRequest(req) {
    return resolveRoutePath(req, {});
}
/** Resolve route path from Appwrite execution (path is often empty without fallbacks). */
function resolveRoutePath(req, body) {
    const headers = req.headers || {};
    const fromBody = typeof body._route === 'string' ? body._route : '';
    const headerPath = headers['x-appwrite-path'] ||
        headers['X-Appwrite-Path'] ||
        headers['x-appwrite-user-path'] ||
        '';
    const raw = (req.path || req.url || headerPath || fromBody || '/').split('?')[0];
    return raw.startsWith('/') ? raw : `/${raw}`;
}
function stripRouteMeta(body) {
    const { _route, ...rest } = body;
    return rest;
}
function getHeaders(req) {
    const headers = req.headers || {};
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = value;
    }
    return normalized;
}
function getClientIp(req) {
    const headers = getHeaders(req);
    const forwarded = headers['x-forwarded-for'];
    if (forwarded)
        return forwarded.split(',')[0].trim();
    return headers['x-appwrite-client-ip'] || headers['cf-connecting-ip'] || 'unknown';
}
function extractAuth(req) {
    const headers = getHeaders(req);
    return {
        userId: headers['x-appwrite-user-id'] || null,
        jwt: headers['x-appwrite-jwt'] || headers['x-appwrite-user-jwt'] || null,
    };
}
async function verifyAuth(req) {
    const { userId, jwt } = extractAuth(req);
    if (userId)
        return userId;
    if (!jwt)
        return null;
    try {
        const client = new node_appwrite_1.Client()
            .setEndpoint(config_1.APPWRITE_ENDPOINT)
            .setProject(config_1.APPWRITE_PROJECT_ID)
            .setJWT(jwt);
        const account = new node_appwrite_1.Account(client);
        const user = await account.get();
        return user.$id;
    }
    catch {
        return null;
    }
}
function jsonResponse(res, data, status = 200) {
    return res.json(data, status);
}
function errorResponse(res, code, message, status = 400) {
    return res.json({ success: false, code, error: message }, status);
}
function requireAuth(res, userId) {
    if (!userId) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return false;
    }
    return true;
}
