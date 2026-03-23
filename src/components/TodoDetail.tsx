import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, TodoComment, PriorityLevel } from '../types/todo';

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/** Parse text into segments: plain text, bare URLs, and [alias](url) links */
function parseContent(text: string): Array<{ type: 'text' | 'link'; value: string; url?: string }> {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>)\]]+)/g;
  const segments: Array<{ type: 'text' | 'link'; value: string; url?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] && match[2]) {
      segments.push({ type: 'link', value: match[1], url: match[2] });
    } else if (match[3]) {
      segments.push({ type: 'link', value: match[3], url: match[3] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

function RenderedContent({ text }: { text: string }) {
  const segments = parseContent(text);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.api.link.open(url);
  };

  return (
    <div className="comment-content">
      {segments.map((seg, i) =>
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
      )}
    </div>
  );
}

export default function TodoDetail({ todo, onUpdate, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo.title);
  const [deadline, setDeadline] = useState(todo.deadline ? toLocalInput(todo.deadline) : '');
  const [reminderTime, setReminderTime] = useState(todo.reminder_time ? toLocalInput(todo.reminder_time) : '');
  const [priority, setPriority] = useState<PriorityLevel>(todo.priority);

  // Comments
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    const data = await window.api.comment.getAll(todo.id);
    setComments(data);
  }, [todo.id]);

  useEffect(() => {
    setTitle(todo.title);
    setDeadline(todo.deadline ? toLocalInput(todo.deadline) : '');
    setReminderTime(todo.reminder_time ? toLocalInput(todo.reminder_time) : '');
    setPriority(todo.priority);
    setEditingId(null);
    setMenuId(null);
    loadComments();
  }, [todo, loadComments]);

  const saveTitle = () => {
    if (title.trim() && title !== todo.title) {
      onUpdate({ title: title.trim() });
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

  // Comment handlers
  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    await window.api.comment.add(todo.id, content);
    setNewComment('');
    await loadComments();
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteComment = async (id: string) => {
    await window.api.comment.delete(id);
    setMenuId(null);
    loadComments();
  };

  const startEdit = (c: TodoComment) => {
    setEditingId(c.id);
    setEditContent(c.content);
    setMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await window.api.comment.update(editingId, editContent.trim());
    setEditingId(null);
    loadComments();
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

        {/* Comments Section */}
        <div className="detail-field comments-field">
          <label>
            댓글
            {comments.length > 0 && <span className="comment-count">{comments.length}</span>}
          </label>

          <div className="comments-list">
            {comments.map((c) => (
              <div key={c.id} className="comment-item">
                {editingId === c.id ? (
                  <div className="comment-edit">
                    <textarea
                      autoFocus
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="comment-edit-input"
                      rows={3}
                    />
                    <div className="comment-edit-actions">
                      <button className="comment-save-btn" onClick={handleSaveEdit}>저장</button>
                      <button className="comment-cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <RenderedContent text={c.content} />
                    <div className="comment-meta">
                      <span title={new Date(c.created_at).toLocaleString('ko-KR')}>
                        {formatTime(c.created_at)}
                        {c.updated_at !== c.created_at && ' (수정됨)'}
                      </span>
                      <div className="comment-menu-wrapper">
                        <button
                          className="comment-menu-btn"
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id); }}
                        >
                          ···
                        </button>
                        {menuId === c.id && (
                          <div className="comment-menu">
                            <button onClick={() => startEdit(c)}>수정</button>
                            <button className="danger" onClick={() => handleDeleteComment(c.id)}>삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          <div className="comment-add">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleAddComment();
              }}
              placeholder={"댓글 작성... (Ctrl+Enter로 저장)\n[이름](URL) 형식으로 링크 추가"}
              className="comment-add-input"
              rows={2}
            />
            <button
              className="comment-add-btn"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              등록
            </button>
          </div>
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
