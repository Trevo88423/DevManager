const { ipcMain } = require('electron');
const { fullScan, killProcess } = require('./scanner');

let autoRefreshTimer = null;
let autoRefreshInterval = 3000;
let mainWindow = null;

function registerIpcHandlers(win) {
  mainWindow = win;

  ipcMain.handle('scan', async () => {
    try {
      return { success: true, data: await fullScan() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('kill', async (_event, pid) => {
    try {
      const result = await killProcess(pid);
      return { success: true, message: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('set-auto-refresh', (_event, interval) => {
    autoRefreshInterval = interval;
    stopAutoRefresh();
    if (interval > 0) {
      startAutoRefresh();
    }
  });

  ipcMain.on('set-compact', (_event, compact) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    if (compact) {
      mainWindow.setMinimumSize(280, 300);
      mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: 340, height: bounds.height });
    } else {
      mainWindow.setMinimumSize(700, 400);
      mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: 960, height: bounds.height });
    }
  });

  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });

  ipcMain.on('window-ready', () => {
    startAutoRefresh();
  });
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (autoRefreshInterval <= 0) return;

  autoRefreshTimer = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Only scan when window is visible
    if (!mainWindow.isVisible() || mainWindow.isMinimized()) return;

    try {
      const data = await fullScan();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scan-result', { success: true, data });
      }
    } catch (err) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scan-result', { success: false, error: err.message });
      }
    }
  }, autoRefreshInterval);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function cleanup() {
  stopAutoRefresh();
  ipcMain.removeHandler('scan');
  ipcMain.removeHandler('kill');
  ipcMain.removeAllListeners('set-auto-refresh');
  ipcMain.removeAllListeners('set-compact');
  ipcMain.removeAllListeners('window-minimize');
  ipcMain.removeAllListeners('window-maximize');
  ipcMain.removeAllListeners('window-close');
  ipcMain.removeAllListeners('window-ready');
}

module.exports = { registerIpcHandlers, startAutoRefresh, stopAutoRefresh, cleanup };
