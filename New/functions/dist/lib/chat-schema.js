"use strict";
/** Chat collection attribute shapes and shared types */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_ATTACHMENTS_MAX = exports.CHAT_BODY_MAX = exports.MEMBER_ROLES = exports.CONVERSATION_TYPES = exports.MESSAGE_TYPES = void 0;
exports.buildDmKey = buildDmKey;
exports.memberReadPermissions = memberReadPermissions;
exports.MESSAGE_TYPES = [
    'text',
    'game_share',
    'achievement_share',
    'store_deal',
    'party_invite',
    'system',
    'lfg',
];
exports.CONVERSATION_TYPES = ['dm', 'group'];
exports.MEMBER_ROLES = ['owner', 'admin', 'member'];
/** Appwrite string attribute limits (collection total size budget) */
exports.CHAT_BODY_MAX = 2048;
exports.CHAT_ATTACHMENTS_MAX = 2048;
function buildDmKey(userA, userB) {
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    return `${a}:${b}`;
}
function memberReadPermissions(memberIds) {
    // Used server-side when creating documents with per-user read access for Realtime
    return memberIds;
}
