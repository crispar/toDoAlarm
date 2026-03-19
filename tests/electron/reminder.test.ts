import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => ':memory:' },
}));

import { ReminderService } from '../../electron/reminder';
import { Todo } from '../../electron/database';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'test-id',
    title: '테스트',
    description: '',
    deadline: null,
    reminder_time: new Date(Date.now() - 60000).toISOString(),
    priority: 'medium',
    status: 'pending',
    category: 'inbox',
    is_daily: 0,
    daily_reset_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sort_order: 0,
    ...overrides,
  };
}

describe('ReminderService', () => {
  let service: ReminderService;
  let mockDb: any;
  let onReminder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDb = {
      getPendingReminders: vi.fn().mockReturnValue([]),
    };
    onReminder = vi.fn();
    service = new ReminderService(mockDb, onReminder);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  test('start() performs initial check immediately', () => {
    service.start();
    expect(mockDb.getPendingReminders).toHaveBeenCalledTimes(1);
  });

  test('start() sets up 15-second interval', () => {
    service.start();
    mockDb.getPendingReminders.mockClear();

    vi.advanceTimersByTime(15000);
    expect(mockDb.getPendingReminders).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(15000);
    expect(mockDb.getPendingReminders).toHaveBeenCalledTimes(2);
  });

  test('check() calls onReminder for pending reminders', () => {
    const todo = makeTodo({ id: 'reminder-1' });
    mockDb.getPendingReminders.mockReturnValue([todo]);

    service.start();

    expect(onReminder).toHaveBeenCalledTimes(1);
    expect(onReminder).toHaveBeenCalledWith(todo);
  });

  test('check() does not re-notify same id', () => {
    const todo = makeTodo({ id: 'reminder-1' });
    mockDb.getPendingReminders.mockReturnValue([todo]);

    service.start();
    expect(onReminder).toHaveBeenCalledTimes(1);

    // Next interval - same todo still pending
    vi.advanceTimersByTime(15000);
    expect(onReminder).toHaveBeenCalledTimes(1); // not called again
  });

  test('check() notifies different todos', () => {
    const todo1 = makeTodo({ id: 'reminder-1', title: '첫 번째' });
    const todo2 = makeTodo({ id: 'reminder-2', title: '두 번째' });

    mockDb.getPendingReminders.mockReturnValueOnce([todo1]);
    service.start();
    expect(onReminder).toHaveBeenCalledTimes(1);

    mockDb.getPendingReminders.mockReturnValueOnce([todo1, todo2]);
    vi.advanceTimersByTime(15000);
    expect(onReminder).toHaveBeenCalledTimes(2); // only todo2 is new
  });

  test('reschedule() clears notified set, allowing re-notification', () => {
    const todo = makeTodo({ id: 'reminder-1' });
    mockDb.getPendingReminders.mockReturnValue([todo]);

    service.start();
    expect(onReminder).toHaveBeenCalledTimes(1);

    service.reschedule();

    vi.advanceTimersByTime(15000);
    expect(onReminder).toHaveBeenCalledTimes(2); // called again after reschedule
  });

  test('stop() clears interval', () => {
    service.start();
    service.stop();

    mockDb.getPendingReminders.mockClear();
    vi.advanceTimersByTime(60000);
    expect(mockDb.getPendingReminders).not.toHaveBeenCalled();
  });

  test('stop() can be called multiple times safely', () => {
    service.start();
    service.stop();
    service.stop(); // no error
  });

  test('check() continues even if onReminder throws', () => {
    const todo1 = makeTodo({ id: 'err-1' });
    const todo2 = makeTodo({ id: 'err-2' });
    mockDb.getPendingReminders.mockReturnValue([todo1, todo2]);

    // First call throws
    onReminder.mockImplementationOnce(() => { throw new Error('callback error'); });

    service.start();

    // Should still have notified todo2 despite todo1 throwing
    expect(onReminder).toHaveBeenCalledTimes(2);
  });

  test('check() survives db.getPendingReminders throwing', () => {
    mockDb.getPendingReminders.mockImplementationOnce(() => { throw new Error('db error'); });

    service.start(); // should not throw

    // Next interval should still work
    mockDb.getPendingReminders.mockReturnValue([]);
    vi.advanceTimersByTime(15000);
    expect(mockDb.getPendingReminders).toHaveBeenCalledTimes(2);
  });
});
