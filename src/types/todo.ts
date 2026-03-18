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
