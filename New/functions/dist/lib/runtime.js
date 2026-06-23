"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.formatError = formatError;
function createLogger(log, error) {
    const prefix = '[QuarkAPI]';
    return {
        log: (msg) => (log ? log(`${prefix} ${msg}`) : console.log(`${prefix} ${msg}`)),
        error: (msg) => (error ? error(`${prefix} ${msg}`) : console.error(`${prefix} ${msg}`)),
    };
}
function formatError(err) {
    if (err instanceof Error)
        return `${err.message}${err.stack ? `\n${err.stack}` : ''}`;
    return String(err);
}
