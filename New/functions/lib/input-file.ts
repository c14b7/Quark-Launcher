// Runtime-safe import: use the official export `node-appwrite/file` (not dist/inputFile.js).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const inputFileModule = require('node-appwrite/file') as {
  InputFile: {
    fromBuffer: (buffer: Buffer, filename: string) => object;
  };
};

export const InputFile = inputFileModule.InputFile;
