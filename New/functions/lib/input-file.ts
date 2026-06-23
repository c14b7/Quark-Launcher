// CJS-compatible wrapper — avoids TS moduleResolution issues with `node-appwrite/file` on Appwrite build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const inputFileModule = require('node-appwrite/dist/inputFile.js') as {
  InputFile: {
    fromBuffer: (buffer: Buffer, filename: string) => object;
  };
};

export const InputFile = inputFileModule.InputFile;
