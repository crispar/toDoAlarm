import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export interface Todo {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  reminder_time: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  category: string;
  is_daily: number; // 0 or 1 (SQLite boolean)
  daily_reset_date: string | null; // last date this daily was reset (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export class Database {
  private db: BetterSqlite3.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'smarttodo.db');
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        deadline TEXT,
        reminder_time TEXT,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
        category TEXT DEFAULT 'inbox',
        is_daily INTEGER DEFAULT 0,
        daily_reset_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    // Migration: add daily columns if they don't exist (for existing DBs)
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN is_daily INTEGER DEFAULT 0`);
    } catch (_) { /* column already exists */ }
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN daily_reset_date TEXT`);
    } catch (_) { /* column already exists */ }

    // Create indexes (after migration so columns exist)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_deadline ON todos(deadline);
      CREATE INDEX IF NOT EXISTS idx_todos_reminder ON todos(reminder_time);
      CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
      CREATE INDEX IF NOT EXISTS idx_todos_daily ON todos(is_daily);
    `);
  }

  getAllTodos(): Todo[] {
    return this.db.prepare(`
      SELECT * FROM todos ORDER BY
        CASE status WHEN 'pending' THEN 0 ELSE 1 END,
        CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        sort_order ASC,
        created_at DESC
    `).all() as Todo[];
  }

  getTodoById(id: string): Todo | undefined {
    return this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
  }

  createTodo(input: Partial<Todo>): Todo {
    const now = new Date().toISOString();
    const id = uuidv4();

    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max_order FROM todos').get() as { max_order: number | null };
    const sortOrder = (maxOrder.max_order ?? -1) + 1;

    const isDaily = input.is_daily ? 1 : 0;
    const today = new Date().toISOString().slice(0, 10);

    const todo: Todo = {
      id,
      title: input.title || '새 할 일',
      description: input.description || '',
      deadline: input.deadline || null,
      reminder_time: input.reminder_time || null,
      priority: input.priority || 'medium',
      status: input.status || 'pending',
      category: input.category || 'inbox',
      is_daily: isDaily,
      daily_reset_date: isDaily ? today : null,
      created_at: now,
      updated_at: now,
      sort_order: sortOrder,
    };

    this.db.prepare(`
      INSERT INTO todos (id, title, description, deadline, reminder_time, priority, status, category, is_daily, daily_reset_date, created_at, updated_at, sort_order)
      VALUES (@id, @title, @description, @deadline, @reminder_time, @priority, @status, @category, @is_daily, @daily_reset_date, @created_at, @updated_at, @sort_order)
    `).run(todo);

    return todo;
  }

  updateTodo(id: string, updates: Partial<Todo>): Todo | undefined {
    const existing = this.getTodoById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };

    this.db.prepare(`
      UPDATE todos SET
        title = @title,
        description = @description,
        deadline = @deadline,
        reminder_time = @reminder_time,
        priority = @priority,
        status = @status,
        category = @category,
        is_daily = @is_daily,
        daily_reset_date = @daily_reset_date,
        updated_at = @updated_at,
        sort_order = @sort_order
      WHERE id = @id
    `).run(updated);

    return updated;
  }

  deleteTodo(id: string): boolean {
    const result = this.db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return result.changes > 0;
  }

  searchTodos(query: string): Todo[] {
    return this.db.prepare(`
      SELECT * FROM todos
      WHERE title LIKE ? OR description LIKE ?
      ORDER BY created_at DESC
    `).all(`%${query}%`, `%${query}%`) as Todo[];
  }

  getPendingReminders(): Todo[] {
    const now = new Date().toISOString();
    return this.db.prepare(`
      SELECT * FROM todos
      WHERE reminder_time IS NOT NULL
        AND reminder_time <= ?
        AND status = 'pending'
    `).all(now) as Todo[];
  }

  /** Reset all daily todos whose reset date is before today */
  resetDailyTodos(): number {
    const today = new Date().toISOString().slice(0, 10);
    const result = this.db.prepare(`
      UPDATE todos SET
        status = 'pending',
        daily_reset_date = ?,
        updated_at = ?
      WHERE is_daily = 1
        AND (daily_reset_date IS NULL OR daily_reset_date < ?)
    `).run(today, new Date().toISOString(), today);
    return result.changes;
  }

  getDailyTodos(): Todo[] {
    return this.db.prepare(`
      SELECT * FROM todos
      WHERE is_daily = 1
      ORDER BY sort_order ASC, created_at ASC
    `).all() as Todo[];
  }

  close() {
    this.db.close();
  }
}
