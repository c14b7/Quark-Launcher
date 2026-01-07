const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,  // Pozwala używać Node.js w renderowanym HTML
            contextIsolation: false, // Umożliwia dostęp do require w renderer
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
