"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputFile = void 0;
// CJS-compatible wrapper — avoids TS moduleResolution issues with `node-appwrite/file` on Appwrite build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const inputFileModule = require('node-appwrite/dist/inputFile.js');
exports.InputFile = inputFileModule.InputFile;
