export interface Todo {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  reminder_time: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  category: string;
  is_daily: number;
  daily_reset_date: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export interface TodoLink {
  id: string;
  todo_id: string;
  url: string;
  alias: string;
  created_at: string;
}

export interface LinkAPI {
  getAll: (todoId: string) => Promise<TodoLink[]>;
  add: (todoId: string, url: string, alias: string) => Promise<TodoLink>;
  update: (id: string, updates: { url?: string; alias?: string }) => Promise<TodoLink>;
  delete: (id: string) => Promise<boolean>;
  open: (url: string) => Promise<void>;
}

export type TodoFilter = 'daily' | 'all' | 'today' | 'upcoming' | 'completed';
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface TodoAPI {
  getAll: () => Promise<Todo[]>;
  getById: (id: string) => Promise<Todo | undefined>;
  create: (todo: Partial<Todo>) => Promise<Todo>;
  update: (id: string, updates: Partial<Todo>) => Promise<Todo>;
  delete: (id: string) => Promise<boolean>;
  search: (query: string) => Promise<Todo[]>;
}

declare global {
  interface Window {
    api: {
      todo: TodoAPI;
      link: LinkAPI;
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
      quickAdd: {
        close: () => void;
      };
      reminder: {
        snooze: (id: string, minutes: number) => void;
        complete: (id: string) => void;
      };
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
  }
}
