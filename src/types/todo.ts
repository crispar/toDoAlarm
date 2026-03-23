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

export interface TodoComment {
  id: string;
  todo_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface LinkAPI {
  open: (url: string) => Promise<void>;
}

export interface CommentAPI {
  getAll: (todoId: string) => Promise<TodoComment[]>;
  add: (todoId: string, content: string) => Promise<TodoComment>;
  update: (id: string, content: string) => Promise<TodoComment>;
  delete: (id: string) => Promise<boolean>;
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
      comment: CommentAPI;
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
