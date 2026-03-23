import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock window.api for renderer tests
const mockApi = {
  todo: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockImplementation(async (input: any) => ({
      id: 'mock-id-' + Date.now(),
      title: input.title || '새 할 일',
      description: input.description || '',
      deadline: input.deadline || null,
      reminder_time: input.reminder_time || null,
      priority: input.priority || 'medium',
      status: input.status || 'pending',
      category: input.category || 'inbox',
      is_daily: input.is_daily || 0,
      daily_reset_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 0,
    })),
    update: vi.fn().mockImplementation(async (id: string, updates: any) => ({
      id,
      title: '테스트',
      description: '',
      deadline: null,
      reminder_time: null,
      priority: 'medium',
      status: 'pending',
      category: 'inbox',
      is_daily: 0,
      daily_reset_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 0,
      ...updates,
    })),
    delete: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([]),
  },
  window: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
  },
  quickAdd: {
    close: vi.fn(),
  },
  link: {
    open: vi.fn().mockResolvedValue(undefined),
  },
  comment: {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockImplementation(async (_todoId: string, content: string) => ({
      id: 'comment-' + Date.now(),
      todo_id: _todoId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
  },
  reminder: {
    snooze: vi.fn(),
    complete: vi.fn(),
  },
  on: vi.fn().mockReturnValue(() => {}),
};

Object.defineProperty(window, 'api', { value: mockApi, writable: true, configurable: true });

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
