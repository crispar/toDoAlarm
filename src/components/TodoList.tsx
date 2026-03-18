import React, { useState, useRef, useEffect } from 'react';
import { Todo, TodoFilter } from '../types/todo';
import TodoItem from './TodoItem';

interface Props {
  todos: Todo[];
  selectedId?: string;
  onSelect: (todo: Todo) => void;
  onToggle: (id: string) => void;
  onCreate: (input: Partial<Todo>) => Promise<Todo>;
  filter: TodoFilter;
  onFilterChange?: (f: TodoFilter) => void;
}

const filterTitles: Record<TodoFilter, string> = {
  daily: '데일리 루프',
  all: '모든 할 일',
  today: '오늘 할 일',
  upcoming: '다가오는 할 일',
  completed: '완료된 할 일',
};

interface DailyProgress {
  done: number;
  total: number;
  allDone: boolean;
}

export default function TodoList({ todos, selectedId, onSelect, onToggle, onCreate, filter, onFilterChange }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Daily loop progress
  const dailyProgress: DailyProgress | null = filter === 'daily' ? (() => {
    const total = todos.length;
    const done = todos.filter(t => t.status === 'completed').length;
    return { done, total, allDone: total > 0 && done === total };
  })() : null;

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;

    const input: Partial<Todo> = { title };

    if (filter === 'daily') {
      (input as any).is_daily = 1;
    } else if (filter === 'today') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      input.deadline = today.toISOString();
    }

    const todo = await onCreate(input);
    setNewTitle('');
    onSelect(todo);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const placeholder = filter === 'daily'
    ? '매일 반복할 루틴 추가... (Enter로 저장)'
    : '새 할 일 추가... (Enter로 저장)';

  return (
    <div className="todo-list-container">
      <div className="todo-list-header">
        <h2>{filterTitles[filter]}</h2>
        {filter === 'daily' && dailyProgress && dailyProgress.total > 0 ? (
          <span className={`daily-status ${dailyProgress.allDone ? 'all-done' : ''}`}>
            {dailyProgress.allDone ? 'All Clear!' : `${dailyProgress.done} / ${dailyProgress.total}`}
          </span>
        ) : (
          <span className="todo-count">{todos.length}개</span>
        )}
      </div>

      {/* Daily all-done banner */}
      {dailyProgress?.allDone && (
        <div className="daily-complete-banner">
          <div className="daily-complete-text">
            오늘의 루틴을 모두 완료했습니다!
          </div>
          <button
            className="daily-go-tasks-btn"
            onClick={() => onFilterChange?.('today')}
          >
            오늘 할 일 보기 →
          </button>
        </div>
      )}

      {/* Daily progress bar */}
      {filter === 'daily' && dailyProgress && dailyProgress.total > 0 && !dailyProgress.allDone && (
        <div className="daily-progress">
          <div className="daily-progress-bar">
            <div
              className="daily-progress-fill"
              style={{ width: `${(dailyProgress.done / dailyProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {filter !== 'completed' && (
        <div className="todo-add-bar">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="todo-add-input"
          />
          <button className="todo-add-btn" onClick={handleAdd} disabled={!newTitle.trim()}>
            추가
          </button>
        </div>
      )}

      <div className="todo-list">
        {todos.length === 0 ? (
          <div className="todo-empty">
            {filter === 'daily'
              ? '매일 반복할 루틴을 추가해보세요!\n예: 이메일 확인, 스탠드업 미팅, 코드 리뷰...'
              : filter === 'completed'
              ? '완료된 할 일이 없습니다'
              : '할 일을 추가해보세요!'}
          </div>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isSelected={todo.id === selectedId}
              onSelect={() => onSelect(todo)}
              onToggle={() => onToggle(todo.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
