import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types/todo';

interface Props {
  onCreate: (input: Partial<Todo>) => Promise<Todo>;
}

export default function QuickAdd({ onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onCreate({ title: title.trim(), priority });
    setTitle('');
    window.api.quickAdd.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      window.api.quickAdd.close();
    }
    // Priority shortcuts
    if (e.ctrlKey) {
      if (e.key === '1') setPriority('high');
      if (e.key === '2') setPriority('medium');
      if (e.key === '3') setPriority('low');
    }
  };

  return (
    <div className="quick-add-overlay">
      <div className="quick-add-container">
        <input
          ref={inputRef}
          type="text"
          placeholder="할 일을 입력하세요... (Enter로 저장, Esc로 닫기)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="quick-add-input"
        />
        <div className="quick-add-footer">
          <div className="quick-add-priorities">
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                className={`qp-btn qp-${p} ${priority === p ? 'active' : ''}`}
                onClick={() => setPriority(p)}
              >
                {p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음'}
              </button>
            ))}
          </div>
          <span className="quick-add-hint">Ctrl+1/2/3 우선순위</span>
        </div>
      </div>
    </div>
  );
}
