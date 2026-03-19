import React, { useEffect, useMemo, useState } from 'react';
import { useTodos } from './hooks/useTodos';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import TodoList from './components/TodoList';
import TodoDetail from './components/TodoDetail';
import QuickAdd from './components/QuickAdd';
import SearchBar from './components/SearchBar';
function App() {
  const isQuickAdd = window.location.hash === '#/quick-add';
  const {
    todos,
    allTodos,
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
  } = useTodos();

  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        searchTodos('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTodos]);

  if (isQuickAdd) {
    return <QuickAdd onCreate={createTodo} />;
  }

  const { dailyProgress, counts } = useMemo(() => {
    const dailyTodos = allTodos.filter(t => t.is_daily === 1);
    const now = new Date();
    const todayStr = now.toDateString();
    const week = new Date(now.getTime() + 7 * 86400000);

    return {
      dailyProgress: {
        done: dailyTodos.filter(t => t.status === 'completed').length,
        total: dailyTodos.length,
      },
      counts: {
        daily: dailyTodos.length,
        all: allTodos.filter(t => t.status !== 'completed' && !t.is_daily).length,
        today: allTodos.filter(t => {
          if (t.is_daily || t.status === 'completed' || !t.deadline) return false;
          return new Date(t.deadline).toDateString() === todayStr;
        }).length,
        upcoming: allTodos.filter(t => {
          if (t.is_daily || t.status === 'completed' || !t.deadline) return false;
          const d = new Date(t.deadline);
          return d >= now && d <= week;
        }).length,
        completed: allTodos.filter(t => t.status === 'completed' && !t.is_daily).length,
      },
    };
  }, [allTodos]);

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <Sidebar
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
          dailyProgress={dailyProgress}
        />
        <div className="main-content">
          {showSearch && (
            <SearchBar
              value={searchQuery}
              onChange={searchTodos}
              onClose={() => { setShowSearch(false); searchTodos(''); }}
            />
          )}
          <TodoList
            todos={todos}
            selectedId={selectedTodo?.id}
            onSelect={setSelectedTodo}
            onToggle={toggleComplete}
            onCreate={createTodo}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
        {selectedTodo && (
          <TodoDetail
            todo={selectedTodo}
            onUpdate={(updates) => updateTodo(selectedTodo.id, updates)}
            onDelete={() => deleteTodo(selectedTodo.id)}
            onClose={() => setSelectedTodo(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
