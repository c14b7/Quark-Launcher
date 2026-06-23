"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFriendCode = generateFriendCode;
exports.generateUniqueFriendCode = generateUniqueFriendCode;
exports.sortUserIds = sortUserIds;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./config");
function generateFriendCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
async function generateUniqueFriendCode(databases, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        const code = generateFriendCode();
        const existing = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, [
            node_appwrite_1.Query.equal('friendCode', code),
            node_appwrite_1.Query.limit(1),
        ]);
        if (existing.documents.length === 0)
            return code;
    }
    throw new Error('Failed to generate unique friend code');
}
function sortUserIds(a, b) {
    return a < b ? [a, b] : [b, a];
}
