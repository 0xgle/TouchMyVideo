'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch) => (...args) => ipcRenderer.invoke(ch, ...args);
const on = (ch) => (cb) => {
  const f = (_e, d) => cb(d);
  ipcRenderer.on(ch, f);
  return () => ipcRenderer.removeListener(ch, f);
};

contextBridge.exposeInMainWorld('tmv', {
  appInfo: invoke('app:info'),

  getSettings: invoke('settings:get'),
  setSettings: invoke('settings:set'),
  pickFolder: invoke('settings:pickFolder'),

  toolsStatus: invoke('tools:status'),
  updateTools: invoke('tools:update'),
  repairTools: invoke('tools:repair'),
  installTools: invoke('tools:install'),

  listJobs: invoke('jobs:list'),
  probe: invoke('jobs:probe'),
  addJob: invoke('jobs:add'),
  cancelJob: invoke('jobs:cancel'),
  retryJob: invoke('jobs:retry'),
  removeJob: invoke('jobs:remove'),
  clearFinished: invoke('jobs:clearFinished'),
  revealJob: invoke('jobs:reveal'),
  openJob: invoke('jobs:open'),

  openDownloads: invoke('shell:openDownloads'),
  openLog: invoke('shell:openLog'),
  openExternal: invoke('shell:openExternal'),

  onJobUpdate: on('jobs:update'),
  onJobList: on('jobs:list'),
  onToolsStatus: on('tools:status'),
  onExternalUrl: on('external:url'),
  onExternalAdded: on('external:added'),
});
