const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers, cleanup } = require('./ipc');
const { createTray, destroyTray } = require('./tray');

// Suppress Chromium GPU cache warnings
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 700,
    minHeight: 400,
    title: 'DevManager',
    backgroundColor: '#0f172a',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  registerIpcHandlers(mainWindow);
  createTray(mainWindow, app);
}

app.whenReady().then(createWindow);

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

app.on('before-quit', () => {
  app.isQuitting = true;
  cleanup();
  destroyTray();
});
