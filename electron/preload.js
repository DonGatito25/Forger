import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('forgerDesktop', {
  isElectron: true,
});
