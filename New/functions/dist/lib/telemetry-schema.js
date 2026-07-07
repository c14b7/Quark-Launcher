"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTelemetrySchemaStatus = getTelemetrySchemaStatus;
exports.isUnknownAttributeError = isUnknownAttributeError;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./config");
const REQUIRED_ATTRS = {
    [config_1.COLLECTIONS.telemetryEvents]: ['installationId', 'sessionId', 'name', 'category', 'timestamp', 'properties'],
    [config_1.COLLECTIONS.telemetryLogs]: ['installationId', 'sessionId', 'level', 'message', 'details', 'timestamp'],
    [config_1.COLLECTIONS.telemetrySessions]: ['installationId', 'startedAt'],
    [config_1.COLLECTIONS.telemetryInstallations]: ['firstSeenAt', 'lastSeenAt'],
};
async function getTelemetrySchemaStatus() {
    const missing = {};
    try {
        const client = new node_appwrite_1.Client()
            .setEndpoint(config_1.APPWRITE_ENDPOINT)
            .setProject(config_1.APPWRITE_PROJECT_ID)
            .setKey(config_1.APPWRITE_API_KEY);
        const databases = new node_appwrite_1.Databases(client);
        for (const [collectionId, required] of Object.entries(REQUIRED_ATTRS)) {
            try {
                const col = await databases.getCollection(config_1.DATABASE_ID, collectionId);
                const attrs = (col.attributes || []);
                const available = new Set(attrs.filter((a) => a.status === 'available').map((a) => a.key));
                const notReady = required.filter((k) => !available.has(k));
                if (notReady.length)
                    missing[collectionId] = notReady;
            }
            catch {
                missing[collectionId] = required;
            }
        }
    }
    catch {
        return { ok: false, missing: { error: ['database_unreachable'] } };
    }
    return { ok: Object.keys(missing).length === 0, missing };
}
function isUnknownAttributeError(err) {
    const e = err;
    const msg = String(e.message || '').toLowerCase();
    return (e.type === 'attribute_unknown' ||
        msg.includes('unknown attribute') ||
        msg.includes('invalid document structure'));
}
