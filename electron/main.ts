import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, Notification } from 'electron';
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
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABhSURBVFhH7c6xDQAgDAQxev9lKRiAgoKCH3kDWDr5k24zs/cfz+kAHehABzrQgQ50oAMd6EAHOtCBDnSgAx3oQAc60IEOdKADHehABzrQgQ50oAMd6EAHOtCBDvxfZi/TaRYhMjMJMAAAAABJRU5ErkJggg=='
  );
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

function setupIPC() {
  // ToDo CRUD
  ipcMain.handle('todo:getAll', () => db.getAllTodos());
  ipcMain.handle('todo:getById', (_, id: string) => db.getTodoById(id));
  ipcMain.handle('todo:create', (_, todo) => db.createTodo(todo));
  ipcMain.handle('todo:update', (_, id: string, updates) => db.updateTodo(id, updates));
  ipcMain.handle('todo:delete', (_, id: string) => db.deleteTodo(id));
  ipcMain.handle('todo:search', (_, query: string) => db.searchTodos(query));

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
  const scheduleNextReset = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const ms = midnight.getTime() - now.getTime();
    setTimeout(() => {
      db.resetDailyTodos();
      mainWindow?.webContents.send('todo:updated');
      scheduleNextReset();
    }, ms);
  };
  scheduleNextReset();
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
