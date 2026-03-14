const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scan: () => ipcRenderer.invoke('scan'),
  kill: (pid) => ipcRenderer.invoke('kill', pid),
  onScanResult: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('scan-result', handler);
    return () => ipcRenderer.removeListener('scan-result', handler);
  },
  setAutoRefresh: (interval) => ipcRenderer.send('set-auto-refresh', interval),
  setCompact: (compact) => ipcRenderer.send('set-compact', compact),
  windowReady: () => ipcRenderer.send('window-ready'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
});
