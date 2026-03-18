import React from 'react';
import { Todo } from '../types/todo';

interface Props {
  todo: Todo;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

const priorityColors: Record<string, string> = {
  high: '#ff4757',
  medium: '#ffa502',
  low: '#2ed573',
};

const priorityLabels: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays === -1) return '어제';
  if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`;
  if (diffDays <= 7) return `${diffDays}일 후`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function TodoItem({ todo, isSelected, onSelect, onToggle }: Props) {
  const isOverdue = todo.deadline && new Date(todo.deadline) < new Date() && todo.status !== 'completed';

  return (
    <div
      className={`todo-item ${isSelected ? 'selected' : ''} ${todo.status === 'completed' ? 'completed' : ''}`}
      onClick={onSelect}
    >
      <button
        className={`todo-checkbox ${todo.status === 'completed' ? 'checked' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ borderColor: todo.status !== 'completed' ? priorityColors[todo.priority] : undefined }}
      >
        {todo.status === 'completed' && (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        )}
      </button>

      <div className="todo-content">
        <div className="todo-title">{todo.title}</div>
        <div className="todo-meta">
          <span
            className="todo-priority"
            style={{ color: priorityColors[todo.priority] }}
          >
            {priorityLabels[todo.priority]}
          </span>
          {todo.deadline && (
            <span className={`todo-deadline ${isOverdue ? 'overdue' : ''}`}>
              {formatDate(todo.deadline)}
            </span>
          )}
          {todo.reminder_time && (
            <span className="todo-reminder">🔔</span>
          )}
          {todo.description && (
            <span className="todo-has-note">📝</span>
          )}
        </div>
      </div>
    </div>
  );
}
