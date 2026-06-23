"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = validateEmail;
exports.validatePassword = validatePassword;
exports.validateName = validateName;
exports.validateDisplayName = validateDisplayName;
exports.validateBio = validateBio;
exports.validateFriendCode = validateFriendCode;
exports.normalizeFriendCode = normalizeFriendCode;
exports.validateCardTheme = validateCardTheme;
exports.validatePresence = validatePresence;
exports.validateCustomStatus = validateCustomStatus;
exports.stripHtml = stripHtml;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_RE = /^[\p{L}\p{N}_\-. ]{2,32}$/u;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const FRIEND_CODE_RE = /^\d{6}$/;
const ALLOWED_GRADIENTS = new Set([
    'violet-fuchsia',
    'blue-cyan',
    'emerald',
    'orange-red',
    'zinc',
]);
function validateEmail(email) {
    if (!email || email.length > 254)
        return 'INVALID_EMAIL';
    if (!EMAIL_RE.test(email))
        return 'INVALID_EMAIL';
    return null;
}
function validatePassword(password) {
    if (!password || password.length < 8)
        return 'WEAK_PASSWORD';
    if (password.length > 256)
        return 'WEAK_PASSWORD';
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
        return 'WEAK_PASSWORD';
    return null;
}
function validateName(name) {
    if (!name || name.trim().length < 2)
        return 'INVALID_NAME';
    if (name.length > 100)
        return 'INVALID_NAME';
    return null;
}
function validateDisplayName(displayName) {
    if (!DISPLAY_NAME_RE.test(displayName))
        return 'INVALID_DISPLAY_NAME';
    return null;
}
function validateBio(bio) {
    if (bio.length > 190)
        return 'INVALID_BIO';
    if (/<[^>]+>/.test(bio))
        return 'INVALID_BIO';
    return null;
}
function validateFriendCode(code) {
    const normalized = code.replace(/\s/g, '');
    if (!FRIEND_CODE_RE.test(normalized))
        return 'INVALID_FRIEND_CODE';
    return null;
}
function normalizeFriendCode(code) {
    return code.replace(/\s/g, '');
}
function validateCardTheme(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (parsed.accentColor && typeof parsed.accentColor === 'string' && !HEX_COLOR_RE.test(parsed.accentColor)) {
            return { valid: false, error: 'INVALID_CARD_THEME' };
        }
        if (parsed.gradientPreset && typeof parsed.gradientPreset === 'string' && !ALLOWED_GRADIENTS.has(parsed.gradientPreset)) {
            return { valid: false, error: 'INVALID_CARD_THEME' };
        }
        if (parsed.glowEnabled !== undefined && typeof parsed.glowEnabled !== 'boolean') {
            return { valid: false, error: 'INVALID_CARD_THEME' };
        }
        if (parsed.borderStyle !== undefined) {
            const allowed = new Set(['default', 'minimal', 'accent']);
            if (typeof parsed.borderStyle !== 'string' || !allowed.has(parsed.borderStyle)) {
                return { valid: false, error: 'INVALID_CARD_THEME' };
            }
        }
        return { valid: true, parsed };
    }
    catch {
        return { valid: false, error: 'INVALID_CARD_THEME' };
    }
}
function validatePresence(presence) {
    if (!['online', 'idle', 'dnd', 'offline'].includes(presence))
        return 'INVALID_PRESENCE';
    return null;
}
function validateCustomStatus(status) {
    if (status.length > 128)
        return 'INVALID_CUSTOM_STATUS';
    return null;
}
function stripHtml(text) {
    return text.replace(/<[^>]+>/g, '');
}
