import React, { useState, useEffect } from 'react';
import { Todo, PriorityLevel } from '../types/todo';

interface Props {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse memo text into segments: plain text, bare URLs, and [alias](url) links */
function parseDescription(text: string): Array<{ type: 'text' | 'link'; value: string; url?: string }> {
  // Match [alias](url) or bare URLs
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>)\]]+)/g;
  const segments: Array<{ type: 'text' | 'link'; value: string; url?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] && match[2]) {
      // [alias](url)
      segments.push({ type: 'link', value: match[1], url: match[2] });
    } else if (match[3]) {
      // bare URL
      segments.push({ type: 'link', value: match[3], url: match[3] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

function RenderedMemo({ text, onClick }: { text: string; onClick: () => void }) {
  const segments = parseDescription(text);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.api.link.open(url);
  };

  return (
    <div className="memo-rendered" onClick={onClick}>
      {segments.length === 0 ? (
        <span className="memo-placeholder">메모를 입력하세요... (클릭하여 편집)</span>
      ) : (
        segments.map((seg, i) =>
          seg.type === 'link' ? (
            <span
              key={i}
              className="memo-link"
              onClick={(e) => handleLinkClick(e, seg.url!)}
              title={seg.url}
            >
              {seg.value}
            </span>
          ) : (
            <span key={i}>{seg.value}</span>
          )
        )
      )}
    </div>
  );
}

export default function TodoDetail({ todo, onUpdate, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);
  const [deadline, setDeadline] = useState(todo.deadline ? toLocalInput(todo.deadline) : '');
  const [reminderTime, setReminderTime] = useState(todo.reminder_time ? toLocalInput(todo.reminder_time) : '');
  const [priority, setPriority] = useState<PriorityLevel>(todo.priority);
  const [editingMemo, setEditingMemo] = useState(false);

  useEffect(() => {
    setTitle(todo.title);
    setDescription(todo.description);
    setDeadline(todo.deadline ? toLocalInput(todo.deadline) : '');
    setReminderTime(todo.reminder_time ? toLocalInput(todo.reminder_time) : '');
    setPriority(todo.priority);
    setEditingMemo(false);
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
    setEditingMemo(false);
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
                handleReminderChange(toLocalInput(t.toISOString()));
              }}>+5분</button>
              <button onClick={() => {
                const t = new Date(Date.now() + 10 * 60000);
                handleReminderChange(toLocalInput(t.toISOString()));
              }}>+10분</button>
              <button onClick={() => {
                const t = new Date(Date.now() + 30 * 60000);
                handleReminderChange(toLocalInput(t.toISOString()));
              }}>+30분</button>
            </div>
          )}
        </div>

        <div className="detail-field">
          <label>데일리 루프</label>
          <button
            className={`daily-toggle ${todo.is_daily ? 'active' : ''}`}
            onClick={() => onUpdate({ is_daily: todo.is_daily ? 0 : 1 })}
          >
            {todo.is_daily ? '🔄 매일 반복 (활성)' : '매일 반복으로 설정'}
          </button>
        </div>

        <div className="detail-field">
          <label>메모 <span className="memo-hint">[이름](URL) 형식으로 링크 추가</span></label>
          {editingMemo ? (
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              className="detail-textarea"
              placeholder={"메모를 입력하세요...\n\n링크 예시:\nhttps://google.com\n[구글](https://google.com)"}
              rows={6}
            />
          ) : (
            <RenderedMemo
              text={description}
              onClick={() => setEditingMemo(true)}
            />
          )}
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
