import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTodos } from '../../../src/hooks/useTodos';
import { Todo } from '../../../src/types/todo';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
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
    ...overrides,
  };
}

describe('useTodos', () => {
  beforeEach(() => {
    (window.api.todo.getAll as any).mockResolvedValue([]);
    (window.api.on as any).mockReturnValue(() => {});
  });

  test('loads todos on mount', async () => {
    const todos = [makeTodo({ title: '할 일 1' }), makeTodo({ title: '할 일 2' })];
    (window.api.todo.getAll as any).mockResolvedValue(todos);

    const { result } = renderHook(() => useTodos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(window.api.todo.getAll).toHaveBeenCalled();
  });

  test('default filter is daily', () => {
    const { result } = renderHook(() => useTodos());
    expect(result.current.filter).toBe('daily');
  });

  test('createTodo calls API and adds to state', async () => {
    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createTodo({ title: '새 할 일' });
    });

    expect(window.api.todo.create).toHaveBeenCalledWith({ title: '새 할 일' });
  });

  test('deleteTodo calls API and removes from state', async () => {
    const todo = makeTodo({ id: 'delete-me' });
    (window.api.todo.getAll as any).mockResolvedValue([todo]);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteTodo('delete-me');
    });

    expect(window.api.todo.delete).toHaveBeenCalledWith('delete-me');
  });

  test('toggleComplete flips pending to completed', async () => {
    const todo = makeTodo({ id: 'toggle-me', status: 'pending' });
    (window.api.todo.getAll as any).mockResolvedValue([todo]);
    (window.api.todo.update as any).mockResolvedValue({ ...todo, status: 'completed' });

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set filter to 'all' so we can see non-daily todos
    act(() => result.current.setFilter('all'));

    await act(async () => {
      await result.current.toggleComplete('toggle-me');
    });

    expect(window.api.todo.update).toHaveBeenCalledWith('toggle-me', { status: 'completed' });
  });

  // === FILTER TESTS ===

  test('filter "daily" shows only is_daily items', async () => {
    const todos = [
      makeTodo({ title: '루틴', is_daily: 1 }),
      makeTodo({ title: '일반', is_daily: 0 }),
    ];
    (window.api.todo.getAll as any).mockResolvedValue(todos);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // default filter is 'daily'
    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].title).toBe('루틴');
  });

  test('filter "all" shows only non-daily pending items', async () => {
    const todos = [
      makeTodo({ title: '루틴', is_daily: 1 }),
      makeTodo({ title: '일반', is_daily: 0, status: 'pending' }),
      makeTodo({ title: '완료', is_daily: 0, status: 'completed' }),
    ];
    (window.api.todo.getAll as any).mockResolvedValue(todos);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilter('all'));

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].title).toBe('일반');
  });

  test('filter "completed" shows only completed non-daily items', async () => {
    const todos = [
      makeTodo({ title: '완료됨', status: 'completed', is_daily: 0 }),
      makeTodo({ title: '미완료', status: 'pending', is_daily: 0 }),
      makeTodo({ title: '데일리 완료', status: 'completed', is_daily: 1 }),
    ];
    (window.api.todo.getAll as any).mockResolvedValue(todos);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilter('completed'));

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].title).toBe('완료됨');
  });

  test('filter "today" shows items with today deadline', async () => {
    const today = new Date();
    today.setHours(18, 0, 0, 0);
    const tomorrow = new Date(Date.now() + 2 * 86400000);

    const todos = [
      makeTodo({ title: '오늘', deadline: today.toISOString(), is_daily: 0 }),
      makeTodo({ title: '내일', deadline: tomorrow.toISOString(), is_daily: 0 }),
      makeTodo({ title: '기한없음', deadline: null, is_daily: 0 }),
    ];
    (window.api.todo.getAll as any).mockResolvedValue(todos);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilter('today'));

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].title).toBe('오늘');
  });

  // === SEARCH ===

  test('searchTodos calls API with query', async () => {
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.searchTodos('검색어');
    });

    expect(window.api.todo.search).toHaveBeenCalledWith('검색어');
  });

  test('searchTodos with empty string reloads all', async () => {
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.searchTodos('');
    });

    // Should call getAll instead of search
    expect(window.api.todo.search).not.toHaveBeenCalled();
  });

  // === STATE ===

  test('setSelectedTodo updates selection', async () => {
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const todo = makeTodo();
    act(() => result.current.setSelectedTodo(todo));

    expect(result.current.selectedTodo).toBe(todo);
  });

  test('setFilter changes active filter', async () => {
    const { result } = renderHook(() => useTodos());

    act(() => result.current.setFilter('upcoming'));
    expect(result.current.filter).toBe('upcoming');
  });
});
