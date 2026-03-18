import React from 'react';
import { TodoFilter } from '../types/todo';

interface Props {
  filter: TodoFilter;
  onFilterChange: (f: TodoFilter) => void;
  counts: Record<TodoFilter, number>;
  dailyProgress?: { done: number; total: number };
}

const filters: { key: TodoFilter; label: string; icon: string; section?: string }[] = [
  { key: 'daily', label: '데일리 루프', icon: '🔄', section: 'focus' },
  { key: 'all', label: '모든 할 일', icon: '📥' },
  { key: 'today', label: '오늘', icon: '📅' },
  { key: 'upcoming', label: '다가오는', icon: '📆' },
  { key: 'completed', label: '완료', icon: '✅' },
];

export default function Sidebar({ filter, onFilterChange, counts, dailyProgress }: Props) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {filters.map((f, i) => (
          <React.Fragment key={f.key}>
            {i === 1 && <div className="sidebar-divider" />}
            <button
              className={`sidebar-item ${filter === f.key ? 'active' : ''} ${f.key === 'daily' ? 'sidebar-daily' : ''}`}
              onClick={() => onFilterChange(f.key)}
            >
              <span className="sidebar-icon">{f.icon}</span>
              <span className="sidebar-label">{f.label}</span>
              {f.key === 'daily' && dailyProgress && dailyProgress.total > 0 ? (
                <span className="sidebar-daily-progress">
                  {dailyProgress.done}/{dailyProgress.total}
                </span>
              ) : (
                <span className="sidebar-count">{counts[f.key]}</span>
              )}
            </button>
            {f.key === 'daily' && dailyProgress && dailyProgress.total > 0 && filter === 'daily' && (
              <div className="sidebar-progress-bar">
                <div
                  className="sidebar-progress-fill"
                  style={{ width: `${(dailyProgress.done / dailyProgress.total) * 100}%` }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-shortcut">Ctrl+Alt+T 빠른 추가</div>
        <div className="sidebar-shortcut">Ctrl+F 검색</div>
      </div>
    </aside>
  );
}
