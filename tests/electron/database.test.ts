import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock electron's app module before importing Database
import { vi } from 'vitest';
vi.mock('electron', () => ({
  app: { getPath: () => ':memory:' },
}));

import { Database, Todo } from '../../electron/database';

describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  // === CREATE ===

  test('createTodo returns todo with generated id and defaults', () => {
    const todo = db.createTodo({ title: '테스트 할 일' });

    expect(todo.id).toBeDefined();
    expect(todo.id.length).toBeGreaterThan(0);
    expect(todo.title).toBe('테스트 할 일');
    expect(todo.description).toBe('');
    expect(todo.priority).toBe('medium');
    expect(todo.status).toBe('pending');
    expect(todo.category).toBe('inbox');
    expect(todo.is_daily).toBe(0);
    expect(todo.daily_reset_date).toBeNull();
    expect(todo.sort_order).toBe(0);
  });

  test('createTodo with all fields preserves values', () => {
    const todo = db.createTodo({
      title: '중요한 일',
      description: '상세 메모',
      deadline: '2026-12-31T23:59:59.000Z',
      reminder_time: '2026-12-31T09:00:00.000Z',
      priority: 'high',
      category: 'work',
    });

    expect(todo.title).toBe('중요한 일');
    expect(todo.description).toBe('상세 메모');
    expect(todo.deadline).toBe('2026-12-31T23:59:59.000Z');
    expect(todo.reminder_time).toBe('2026-12-31T09:00:00.000Z');
    expect(todo.priority).toBe('high');
    expect(todo.category).toBe('work');
  });

  test('createTodo with is_daily sets daily fields', () => {
    const todo = db.createTodo({ title: '매일 루틴', is_daily: 1 });

    expect(todo.is_daily).toBe(1);
    expect(todo.daily_reset_date).toBe(new Date().toISOString().slice(0, 10));
  });

  test('createTodo increments sort_order', () => {
    const t1 = db.createTodo({ title: '첫 번째' });
    const t2 = db.createTodo({ title: '두 번째' });
    const t3 = db.createTodo({ title: '세 번째' });

    expect(t1.sort_order).toBe(0);
    expect(t2.sort_order).toBe(1);
    expect(t3.sort_order).toBe(2);
  });

  test('createTodo with empty title uses default', () => {
    const todo = db.createTodo({});
    expect(todo.title).toBe('새 할 일');
  });

  // === READ ===

  test('getAllTodos returns all todos sorted by status then priority', () => {
    db.createTodo({ title: '낮음', priority: 'low' });
    db.createTodo({ title: '높음', priority: 'high' });
    db.createTodo({ title: '완료됨', priority: 'high', status: 'completed' });

    const todos = db.getAllTodos();
    expect(todos).toHaveLength(3);
    // pending+high first, then pending+low, then completed
    expect(todos[0].title).toBe('높음');
    expect(todos[1].title).toBe('낮음');
    expect(todos[2].title).toBe('완료됨');
  });

  test('getTodoById returns correct todo', () => {
    const created = db.createTodo({ title: '찾을 할 일' });
    const found = db.getTodoById(created.id);

    expect(found).toBeDefined();
    expect(found!.title).toBe('찾을 할 일');
  });

  test('getTodoById returns undefined for nonexistent id', () => {
    const found = db.getTodoById('nonexistent-id');
    expect(found).toBeUndefined();
  });

  // === UPDATE ===

  test('updateTodo merges fields correctly', () => {
    const created = db.createTodo({ title: '원래 제목', priority: 'low' });
    const updated = db.updateTodo(created.id, { title: '수정된 제목' });

    expect(updated).toBeDefined();
    expect(updated!.title).toBe('수정된 제목');
    expect(updated!.priority).toBe('low'); // unchanged
    // updated_at should be set (may be same ms in fast tests)
    expect(updated!.updated_at).toBeDefined();
  });

  test('updateTodo returns undefined for nonexistent id', () => {
    const result = db.updateTodo('nonexistent', { title: 'nope' });
    expect(result).toBeUndefined();
  });

  test('updateTodo changes status to completed', () => {
    const created = db.createTodo({ title: '완료할 일' });
    const updated = db.updateTodo(created.id, { status: 'completed' });

    expect(updated!.status).toBe('completed');

    // Verify persisted
    const fetched = db.getTodoById(created.id);
    expect(fetched!.status).toBe('completed');
  });

  // === DELETE ===

  test('deleteTodo returns true for existing todo', () => {
    const created = db.createTodo({ title: '삭제할 일' });
    const result = db.deleteTodo(created.id);

    expect(result).toBe(true);
    expect(db.getTodoById(created.id)).toBeUndefined();
  });

  test('deleteTodo returns false for nonexistent id', () => {
    const result = db.deleteTodo('nonexistent');
    expect(result).toBe(false);
  });

  // === SEARCH ===

  test('searchTodos matches title', () => {
    db.createTodo({ title: '이메일 확인' });
    db.createTodo({ title: '코드 리뷰' });
    db.createTodo({ title: '이메일 답장' });

    const results = db.searchTodos('이메일');
    expect(results).toHaveLength(2);
  });

  test('searchTodos matches description', () => {
    db.createTodo({ title: '회의', description: '마케팅팀 주간 회의' });
    db.createTodo({ title: '점심' });

    const results = db.searchTodos('마케팅');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('회의');
  });

  test('searchTodos returns empty for no match', () => {
    db.createTodo({ title: '할 일' });
    const results = db.searchTodos('존재하지않는검색어');
    expect(results).toHaveLength(0);
  });

  test('searchTodos truncates query longer than 200 chars', () => {
    db.createTodo({ title: '할 일' });
    const longQuery = 'a'.repeat(500);
    // Should not throw
    const results = db.searchTodos(longQuery);
    expect(results).toHaveLength(0);
  });

  // === REMINDERS ===

  test('getPendingReminders returns only past-due pending reminders', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    const future = new Date(Date.now() + 3600000).toISOString();

    db.createTodo({ title: '과거 알림', reminder_time: past });
    db.createTodo({ title: '미래 알림', reminder_time: future });
    db.createTodo({ title: '알림 없음' });

    const pending = db.getPendingReminders();
    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe('과거 알림');
  });

  test('getPendingReminders excludes completed todos', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    const todo = db.createTodo({ title: '완료된 알림', reminder_time: past });
    db.updateTodo(todo.id, { status: 'completed' });

    const pending = db.getPendingReminders();
    expect(pending).toHaveLength(0);
  });

  // === DAILY ===

  test('getDailyTodos returns only daily items', () => {
    db.createTodo({ title: '매일 루틴', is_daily: 1 });
    db.createTodo({ title: '일반 할 일' });

    const dailies = db.getDailyTodos();
    expect(dailies).toHaveLength(1);
    expect(dailies[0].title).toBe('매일 루틴');
  });

  test('resetDailyTodos resets completed daily todos for new day', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const daily = db.createTodo({ title: '매일 루틴', is_daily: 1 });
    db.updateTodo(daily.id, { status: 'completed', daily_reset_date: yesterday });

    const resetCount = db.resetDailyTodos();
    expect(resetCount).toBe(1);

    const fetched = db.getTodoById(daily.id);
    expect(fetched!.status).toBe('pending');
    expect(fetched!.daily_reset_date).toBe(new Date().toISOString().slice(0, 10));
  });

  test('resetDailyTodos does not reset already-reset-today todos', () => {
    const today = new Date().toISOString().slice(0, 10);

    const daily = db.createTodo({ title: '매일 루틴', is_daily: 1 });
    db.updateTodo(daily.id, { status: 'completed', daily_reset_date: today });

    const resetCount = db.resetDailyTodos();
    expect(resetCount).toBe(0);

    // status should remain completed since already reset today
    const fetched = db.getTodoById(daily.id);
    expect(fetched!.status).toBe('completed');
  });

  test('resetDailyTodos does not affect non-daily todos', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const regular = db.createTodo({ title: '일반 할 일' });
    db.updateTodo(regular.id, { status: 'completed' });

    const resetCount = db.resetDailyTodos();
    expect(resetCount).toBe(0);

    const fetched = db.getTodoById(regular.id);
    expect(fetched!.status).toBe('completed');
  });

  // === EDGE CASES ===

  test('multiple operations maintain data integrity', () => {
    const t1 = db.createTodo({ title: '하나' });
    const t2 = db.createTodo({ title: '둘' });
    const t3 = db.createTodo({ title: '셋' });

    db.updateTodo(t2.id, { status: 'completed' });
    db.deleteTodo(t3.id);

    const all = db.getAllTodos();
    expect(all).toHaveLength(2);
    expect(all.find(t => t.id === t1.id)!.status).toBe('pending');
    expect(all.find(t => t.id === t2.id)!.status).toBe('completed');
  });

  // === LINKS ===

  test('addLink creates a link for a todo', () => {
    const todo = db.createTodo({ title: '링크 테스트' });
    const link = db.addLink(todo.id, 'https://example.com', '예시');

    expect(link.id).toBeDefined();
    expect(link.todo_id).toBe(todo.id);
    expect(link.url).toBe('https://example.com');
    expect(link.alias).toBe('예시');
  });

  test('getLinks returns links for a todo', () => {
    const todo = db.createTodo({ title: '링크 테스트' });
    db.addLink(todo.id, 'https://a.com', 'A');
    db.addLink(todo.id, 'https://b.com', 'B');

    const links = db.getLinks(todo.id);
    expect(links).toHaveLength(2);
    expect(links[0].alias).toBe('A');
    expect(links[1].alias).toBe('B');
  });

  test('getLinks returns empty array for todo with no links', () => {
    const todo = db.createTodo({ title: '링크 없음' });
    expect(db.getLinks(todo.id)).toHaveLength(0);
  });

  test('updateLink changes url and alias', () => {
    const todo = db.createTodo({ title: '링크 수정' });
    const link = db.addLink(todo.id, 'https://old.com', '이전');
    const updated = db.updateLink(link.id, { url: 'https://new.com', alias: '새로운' });

    expect(updated).toBeDefined();
    expect(updated!.url).toBe('https://new.com');
    expect(updated!.alias).toBe('새로운');
  });

  test('updateLink returns undefined for nonexistent id', () => {
    expect(db.updateLink('no-id', { alias: 'x' })).toBeUndefined();
  });

  test('deleteLink removes a link', () => {
    const todo = db.createTodo({ title: '링크 삭제' });
    const link = db.addLink(todo.id, 'https://del.com', '');

    expect(db.deleteLink(link.id)).toBe(true);
    expect(db.getLinks(todo.id)).toHaveLength(0);
  });

  test('deleteLink returns false for nonexistent id', () => {
    expect(db.deleteLink('no-id')).toBe(false);
  });

  test('deleting todo cascades to links', () => {
    const todo = db.createTodo({ title: '카스케이드' });
    db.addLink(todo.id, 'https://a.com', '');
    db.addLink(todo.id, 'https://b.com', '');

    db.deleteTodo(todo.id);
    expect(db.getLinks(todo.id)).toHaveLength(0);
  });
});
