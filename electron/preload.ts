import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // ToDo operations
  todo: {
    getAll: () => ipcRenderer.invoke('todo:getAll'),
    getById: (id: string) => ipcRenderer.invoke('todo:getById', id),
    create: (todo: any) => ipcRenderer.invoke('todo:create', todo),
    update: (id: string, updates: any) => ipcRenderer.invoke('todo:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('todo:delete', id),
    search: (query: string) => ipcRenderer.invoke('todo:search', query),
  },

  // Link operations
  link: {
    getAll: (todoId: string) => ipcRenderer.invoke('link:getAll', todoId),
    add: (todoId: string, url: string, alias: string) => ipcRenderer.invoke('link:add', todoId, url, alias),
    update: (id: string, updates: { url?: string; alias?: string }) => ipcRenderer.invoke('link:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('link:delete', id),
    open: (url: string) => ipcRenderer.invoke('link:open', url),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  quickAdd: {
    close: () => ipcRenderer.send('quickadd:close'),
  },

  // Reminder actions
  reminder: {
    snooze: (id: string, minutes: number) => ipcRenderer.send('reminder:snooze', id, minutes),
    complete: (id: string) => ipcRenderer.send('reminder:complete', id),
  },

  // Listen for events from main process
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['todo:updated', 'todo:focus'];
    if (validChannels.includes(channel)) {
      const listener = (_: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
};

contextBridge.exposeInMainWorld('api', api);
