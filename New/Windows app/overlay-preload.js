const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  onMetrics: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('overlay-metrics', fn);
    return () => ipcRenderer.removeListener('overlay-metrics', fn);
  },
  onConfig: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('overlay-config', fn);
    return () => ipcRenderer.removeListener('overlay-config', fn);
  },
  onSessionStart: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('overlay-session-start', fn);
    return () => ipcRenderer.removeListener('overlay-session-start', fn);
  },
  onNotification: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('overlay-notification', fn);
    return () => ipcRenderer.removeListener('overlay-notification', fn);
  },
});
