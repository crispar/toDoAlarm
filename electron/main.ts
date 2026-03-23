import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, Notification, shell } from 'electron';
import path from 'path';
import { Database } from './database';
import { ReminderService } from './reminder';

let mainWindow: BrowserWindow | null = null;
let quickAddWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: Database;
let reminderService: ReminderService;

const isDev = !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createQuickAddWindow() {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.show();
    quickAddWindow.focus();
    return;
  }

  quickAddWindow = new BrowserWindow({
    width: 500,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    quickAddWindow.loadURL('http://localhost:5173/#/quick-add');
  } else {
    quickAddWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/quick-add' });
  }

  quickAddWindow.on('blur', () => {
    quickAddWindow?.hide();
  });

  quickAddWindow.on('closed', () => {
    quickAddWindow = null;
  });
}

function createTray() {
  const trayIconPath = isDev
    ? path.join(__dirname, '../public/tray-icon.png')
    : path.join(process.resourcesPath, 'tray-icon.png');
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '열기', click: () => mainWindow?.show() },
    { label: '빠른 추가 (Ctrl+Alt+T)', click: () => createQuickAddWindow() },
    { type: 'separator' },
    { label: '종료', click: () => { app.exit(); } },
  ]);

  tray.setToolTip('SmartToDo');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

function registerShortcuts() {
  globalShortcut.register('Ctrl+Alt+T', () => {
    createQuickAddWindow();
  });
}

function safeHandle(channel: string, handler: (...args: any[]) => any) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(`IPC ${channel} error:`, err);
      throw err;
    }
  });
}

function setupIPC() {
  // ToDo CRUD
  safeHandle('todo:getAll', () => db.getAllTodos());
  safeHandle('todo:getById', (id: string) => db.getTodoById(id));
  safeHandle('todo:create', (todo) => db.createTodo(todo));
  safeHandle('todo:update', (id: string, updates) => db.updateTodo(id, updates));
  safeHandle('todo:delete', (id: string) => db.deleteTodo(id));
  safeHandle('todo:search', (query: string) => db.searchTodos(query));

  // Links
  safeHandle('link:getAll', (todoId: string) => db.getLinks(todoId));
  safeHandle('link:add', (todoId: string, url: string, alias: string) => db.addLink(todoId, url, alias));
  safeHandle('link:update', (id: string, updates: { url?: string; alias?: string }) => db.updateLink(id, updates));
  safeHandle('link:delete', (id: string) => db.deleteLink(id));
  safeHandle('link:open', (url: string) => shell.openExternal(url));

  // Comments
  safeHandle('comment:getAll', (todoId: string) => db.getComments(todoId));
  safeHandle('comment:add', (todoId: string, content: string) => db.addComment(todoId, content));
  safeHandle('comment:update', (id: string, content: string) => db.updateComment(id, content));
  safeHandle('comment:delete', (id: string) => db.deleteComment(id));

  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.hide());
  ipcMain.on('quickadd:close', () => quickAddWindow?.hide());

  // Reminder actions from notification
  ipcMain.on('reminder:snooze', (_, id: string, minutes: number) => {
    const todo = db.getTodoById(id);
    if (todo) {
      const newTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      db.updateTodo(id, { reminder_time: newTime });
      reminderService.reschedule();
    }
  });

  ipcMain.on('reminder:complete', (_, id: string) => {
    db.updateTodo(id, { status: 'completed' });
    mainWindow?.webContents.send('todo:updated');
  });
}

app.whenReady().then(() => {
  db = new Database();
  reminderService = new ReminderService(db, (todo) => {
    const notification = new Notification({
      title: `📋 ${todo.title}`,
      body: todo.description || '할 일을 확인하세요!',
      urgency: todo.priority === 'high' ? 'critical' : 'normal',
      timeoutType: 'never',
      actions: [
        { type: 'button' as const, text: '완료' },
        { type: 'button' as const, text: '5분 후' },
      ],
    });

    notification.on('click', () => {
      mainWindow?.show();
      mainWindow?.webContents.send('todo:focus', todo.id);
    });

    notification.on('action', (_, index) => {
      if (index === 0) {
        db.updateTodo(todo.id, { status: 'completed' });
        mainWindow?.webContents.send('todo:updated');
      } else if (index === 1) {
        const newTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        db.updateTodo(todo.id, { reminder_time: newTime });
        reminderService.reschedule();
      }
    });

    notification.show();
  });

  // Auto-reset daily todos on startup
  const resetCount = db.resetDailyTodos();
  if (resetCount > 0) {
    console.log(`Reset ${resetCount} daily todos for today`);
  }

  createMainWindow();
  createTray();
  registerShortcuts();
  setupIPC();
  reminderService.start();

  // Schedule midnight daily reset
  let midnightTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleNextReset = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const ms = midnight.getTime() - now.getTime();
    midnightTimer = setTimeout(() => {
      db.resetDailyTodos();
      mainWindow?.webContents.send('todo:updated');
      scheduleNextReset();
    }, ms);
  };
  scheduleNextReset();

  app.on('will-quit', () => {
    if (midnightTimer) clearTimeout(midnightTimer);
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
  else mainWindow.show();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  reminderService.stop();
  db.close();
});
