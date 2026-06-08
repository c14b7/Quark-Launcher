// global.d.ts
import { IElectronAPI } from './lib/types'; // <-- Dopasuj ścieżkę do Twojego pliku types.ts

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export {};
