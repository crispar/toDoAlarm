import React, { useState, useEffect } from 'react';
import { Todo, PriorityLevel } from '../types/todo';

interface Props {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function TodoDetail({ todo, onUpdate, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);
  const [deadline, setDeadline] = useState(todo.deadline ? todo.deadline.slice(0, 16) : '');
  const [reminderTime, setReminderTime] = useState(todo.reminder_time ? todo.reminder_time.slice(0, 16) : '');
  const [priority, setPriority] = useState<PriorityLevel>(todo.priority);

  useEffect(() => {
    setTitle(todo.title);
    setDescription(todo.description);
    setDeadline(todo.deadline ? todo.deadline.slice(0, 16) : '');
    setReminderTime(todo.reminder_time ? todo.reminder_time.slice(0, 16) : '');
    setPriority(todo.priority);
  }, [todo]);

  const saveTitle = () => {
    if (title.trim() && title !== todo.title) {
      onUpdate({ title: title.trim() });
    }
  };

  const saveDescription = () => {
    if (description !== todo.description) {
      onUpdate({ description });
    }
  };

  const handleDeadlineChange = (val: string) => {
    setDeadline(val);
    onUpdate({ deadline: val ? new Date(val).toISOString() : null });
  };

  const handleReminderChange = (val: string) => {
    setReminderTime(val);
    onUpdate({ reminder_time: val ? new Date(val).toISOString() : null });
  };

  const handlePriorityChange = (p: PriorityLevel) => {
    setPriority(p);
    onUpdate({ priority: p });
  };

  const handleDelete = () => {
    if (confirm('이 할 일을 삭제하시겠습니까?')) {
      onDelete();
    }
  };

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <h3>상세 정보</h3>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        <div className="detail-field">
          <label>제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            className="detail-input"
          />
        </div>

        <div className="detail-field">
          <label>우선순위</label>
          <div className="priority-selector">
            {(['low', 'medium', 'high'] as PriorityLevel[]).map((p) => (
              <button
                key={p}
                className={`priority-btn priority-${p} ${priority === p ? 'active' : ''}`}
                onClick={() => handlePriorityChange(p)}
              >
                {p === 'low' ? '낮음' : p === 'medium' ? '보통' : '높음'}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-field">
          <label>기한</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => handleDeadlineChange(e.target.value)}
            className="detail-input"
          />
        </div>

        <div className="detail-field">
          <label>리마인더</label>
          <input
            type="datetime-local"
            value={reminderTime}
            onChange={(e) => handleReminderChange(e.target.value)}
            className="detail-input"
          />
          {reminderTime && (
            <div className="snooze-buttons">
              <button onClick={() => {
                const t = new Date(Date.now() + 5 * 60000);
                handleReminderChange(t.toISOString().slice(0, 16));
              }}>+5분</button>
              <button onClick={() => {
                const t = new Date(Date.now() + 10 * 60000);
                handleReminderChange(t.toISOString().slice(0, 16));
              }}>+10분</button>
              <button onClick={() => {
                const t = new Date(Date.now() + 30 * 60000);
                handleReminderChange(t.toISOString().slice(0, 16));
              }}>+30분</button>
            </div>
          )}
        </div>

        <div className="detail-field">
          <label>데일리 루프</label>
          <button
            className={`daily-toggle ${todo.is_daily ? 'active' : ''}`}
            onClick={() => onUpdate({ is_daily: todo.is_daily ? 0 : 1 } as any)}
          >
            {todo.is_daily ? '🔄 매일 반복 (활성)' : '매일 반복으로 설정'}
          </button>
        </div>

        <div className="detail-field">
          <label>메모</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            className="detail-textarea"
            placeholder="메모를 입력하세요..."
            rows={6}
          />
        </div>

        <div className="detail-info">
          <span>생성: {new Date(todo.created_at).toLocaleString('ko-KR')}</span>
          <span>수정: {new Date(todo.updated_at).toLocaleString('ko-KR')}</span>
        </div>

        <button className="delete-btn" onClick={handleDelete}>
          삭제
        </button>
      </div>
    </aside>
  );
}
