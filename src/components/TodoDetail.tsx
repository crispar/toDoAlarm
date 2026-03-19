import React, { useState, useEffect, useCallback } from 'react';
import { Todo, TodoLink, PriorityLevel } from '../types/todo';

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

export default function TodoDetail({ todo, onUpdate, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);
  const [deadline, setDeadline] = useState(todo.deadline ? toLocalInput(todo.deadline) : '');
  const [reminderTime, setReminderTime] = useState(todo.reminder_time ? toLocalInput(todo.reminder_time) : '');
  const [priority, setPriority] = useState<PriorityLevel>(todo.priority);

  // Links state
  const [links, setLinks] = useState<TodoLink[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editAlias, setEditAlias] = useState('');

  const loadLinks = useCallback(async () => {
    const data = await window.api.link.getAll(todo.id);
    setLinks(data);
  }, [todo.id]);

  useEffect(() => {
    setTitle(todo.title);
    setDescription(todo.description);
    setDeadline(todo.deadline ? toLocalInput(todo.deadline) : '');
    setReminderTime(todo.reminder_time ? toLocalInput(todo.reminder_time) : '');
    setPriority(todo.priority);
    loadLinks();
  }, [todo, loadLinks]);

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

  // Link handlers
  const handleAddLink = async () => {
    const url = newUrl.trim();
    if (!url) return;
    await window.api.link.add(todo.id, url, newAlias.trim());
    setNewUrl('');
    setNewAlias('');
    loadLinks();
  };

  const handleDeleteLink = async (id: string) => {
    await window.api.link.delete(id);
    loadLinks();
  };

  const handleOpenLink = (url: string) => {
    window.api.link.open(url);
  };

  const startEditLink = (link: TodoLink) => {
    setEditingLinkId(link.id);
    setEditUrl(link.url);
    setEditAlias(link.alias);
  };

  const handleSaveEditLink = async () => {
    if (!editingLinkId || !editUrl.trim()) return;
    await window.api.link.update(editingLinkId, { url: editUrl.trim(), alias: editAlias.trim() });
    setEditingLinkId(null);
    loadLinks();
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
          <label>연관 링크</label>
          <div className="links-section">
            {links.map((link) => (
              <div key={link.id} className="link-item">
                {editingLinkId === link.id ? (
                  <div className="link-edit-form">
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="URL"
                      className="link-input"
                    />
                    <input
                      type="text"
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="표시 이름 (선택)"
                      className="link-input"
                    />
                    <div className="link-edit-actions">
                      <button className="link-save-btn" onClick={handleSaveEditLink}>저장</button>
                      <button className="link-cancel-btn" onClick={() => setEditingLinkId(null)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className="link-text"
                      onClick={() => handleOpenLink(link.url)}
                      title={link.url}
                    >
                      {link.alias || link.url}
                    </span>
                    <div className="link-actions">
                      <button className="link-edit-btn" onClick={() => startEditLink(link)} title="수정">✎</button>
                      <button className="link-delete-btn" onClick={() => handleDeleteLink(link.id)} title="삭제">✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="link-add-form">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="link-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="표시 이름 (선택)"
                className="link-input link-alias-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <button className="link-add-btn" onClick={handleAddLink} disabled={!newUrl.trim()}>추가</button>
            </div>
          </div>
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
