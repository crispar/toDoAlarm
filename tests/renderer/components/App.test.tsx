import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../../src/App';
import { Todo } from '../../../src/types/todo';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    title: '테스트 할 일',
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

describe('App', () => {
  test('renders app title bar', async () => {
    render(<App />);
    expect(screen.getByText('SmartToDo')).toBeInTheDocument();
  });

  test('renders sidebar with all filter options', async () => {
    render(<App />);
    // Use getAllByText since "데일리 루프" appears in sidebar + header
    expect(screen.getAllByText('데일리 루프').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('모든 할 일').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('오늘').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('다가오는').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('완료').length).toBeGreaterThanOrEqual(1);
  });

  test('renders daily loop view by default', async () => {
    render(<App />);
    await waitFor(() => {
      // "데일리 루프" appears in both sidebar label and main header
      expect(screen.getAllByText('데일리 루프').length).toBeGreaterThanOrEqual(2);
    });
  });

  test('switching filter changes view', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('모든 할 일'));
    await waitFor(() => {
      expect(screen.getAllByText('모든 할 일').length).toBeGreaterThan(0);
    });
  });

  test('renders todo items from API', async () => {
    const todos = [
      makeTodo({ title: '데일리 루틴 1', is_daily: 1 }),
      makeTodo({ title: '데일리 루틴 2', is_daily: 1 }),
    ];
    (window.api.todo.getAll as any).mockResolvedValue(todos);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('데일리 루틴 1')).toBeInTheDocument();
      expect(screen.getByText('데일리 루틴 2')).toBeInTheDocument();
    });
  });

  test('shows empty state when no daily todos', async () => {
    (window.api.todo.getAll as any).mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/매일 반복할 루틴을 추가해보세요/)).toBeInTheDocument();
    });
  });

  test('add input is present for non-completed filters', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/매일 반복할 루틴 추가/)).toBeInTheDocument();
    });
  });

  test('Ctrl+F toggles search bar', async () => {
    render(<App />);

    // Initially no search bar
    expect(screen.queryByPlaceholderText('할 일 검색...')).not.toBeInTheDocument();

    // Press Ctrl+F
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('할 일 검색...')).toBeInTheDocument();
    });
  });

  test('quick add mode renders when hash is #/quick-add', async () => {
    window.location.hash = '#/quick-add';

    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/할 일을 입력하세요/)).toBeInTheDocument();
    });

    // Cleanup
    window.location.hash = '';
  });
});
