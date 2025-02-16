const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#000000', // P7d21
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL('http://localhost:3000');
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('read-games', async () => {
  const data = fs.readFileSync(path.join(__dirname, 'games.json'));
  return JSON.parse(data);
});

ipcMain.handle('write-games', async (event, games) => {
  fs.writeFileSync(path.join(__dirname, 'games.json'), JSON.stringify(games, null, 2));
});
