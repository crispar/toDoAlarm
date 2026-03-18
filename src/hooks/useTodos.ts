import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoFilter } from '../types/todo';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoFilter>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    try {
      const data = await window.api.todo.getAll();
      setTodos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
    const unsub = window.api.on('todo:updated', loadTodos);
    return unsub;
  }, [loadTodos]);

  const createTodo = useCallback(async (input: Partial<Todo>) => {
    const todo = await window.api.todo.create(input);
    setTodos((prev) => [todo, ...prev]);
    return todo;
  }, []);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    const updated = await window.api.todo.update(id, updates);
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    if (selectedTodo?.id === id) setSelectedTodo(updated);
    return updated;
  }, [selectedTodo]);

  const deleteTodo = useCallback(async (id: string) => {
    await window.api.todo.delete(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (selectedTodo?.id === id) setSelectedTodo(null);
  }, [selectedTodo]);

  const toggleComplete = useCallback(async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    await updateTodo(id, { status: newStatus });
  }, [todos, updateTodo]);

  const searchTodos = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadTodos();
      return;
    }
    const results = await window.api.todo.search(query);
    setTodos(results);
  }, [loadTodos]);

  const filteredTodos = todos.filter((todo) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const weekLater = new Date(today.getTime() + 7 * 86400000);

    switch (filter) {
      case 'daily':
        return todo.is_daily === 1;
      case 'today': {
        if (todo.is_daily) return false;
        if (todo.status === 'completed') return false;
        if (!todo.deadline) return false;
        const dl = new Date(todo.deadline);
        return dl >= today && dl < tomorrow;
      }
      case 'upcoming': {
        if (todo.is_daily) return false;
        if (todo.status === 'completed') return false;
        if (!todo.deadline) return false;
        const dl = new Date(todo.deadline);
        return dl >= today && dl < weekLater;
      }
      case 'completed':
        return todo.status === 'completed' && !todo.is_daily;
      default:
        return todo.status !== 'completed' && !todo.is_daily;
    }
  });

  return {
    todos: filteredTodos,
    allTodos: todos,
    filter,
    setFilter,
    searchQuery,
    searchTodos,
    selectedTodo,
    setSelectedTodo,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    loading,
    reload: loadTodos,
  };
}
