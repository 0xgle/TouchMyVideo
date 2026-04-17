const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tmv', {
  startDownload:    (p)  => ipcRenderer.invoke('start-download', p),
  cancelDownload:   (id) => ipcRenderer.invoke('cancel-download', id),
  getHistory:       ()   => ipcRenderer.invoke('get-history'),
  clearHistory:     ()   => ipcRenderer.invoke('clear-history'),
  openDownloads:    ()   => ipcRenderer.invoke('open-downloads'),
  getVersion:       ()   => ipcRenderer.invoke('get-version'),
  toolsReady:       ()   => ipcRenderer.invoke('tools-ready'),
  openLog:          ()   => ipcRenderer.invoke('open-log'),
  reinstallTools:   ()   => ipcRenderer.invoke('reinstall-tools'),
  getDownloadsDir:  ()   => ipcRenderer.invoke('get-downloads-dir'),
  getSettings:      ()   => ipcRenderer.invoke('get-settings'),
  saveSettings:     (s)  => ipcRenderer.invoke('save-settings', s),
  pickFolder:       ()   => ipcRenderer.invoke('pick-folder'),

  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),
  quit:     () => ipcRenderer.send('window-quit'),

  onDownloadStarted:  (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('download-started',  f); return ()=>ipcRenderer.off('download-started',  f); },
  onDownloadProgress: (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('download-progress', f); return ()=>ipcRenderer.off('download-progress', f); },
  onDownloadComplete: (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('download-complete', f); return ()=>ipcRenderer.off('download-complete', f); },
  onHistoryUpdate:    (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('history-update',    f); return ()=>ipcRenderer.off('history-update',    f); },
  onSetupStart:       (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('setup-start',       f); return ()=>ipcRenderer.off('setup-start',       f); },
  onSetupProgress:    (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('setup-progress',    f); return ()=>ipcRenderer.off('setup-progress',    f); },
  onSetupDone:        (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('setup-done',        f); return ()=>ipcRenderer.off('setup-done',        f); },
  onSetupError:       (cb) => { const f = (_,d)=>cb(d); ipcRenderer.on('setup-error',       f); return ()=>ipcRenderer.off('setup-error',       f); },
});
