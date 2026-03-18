import React, { useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (query: string) => void;
  onClose: () => void;
}

export default function SearchBar({ value, onChange, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="할 일 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className="search-input"
      />
      <button className="search-close" onClick={onClose}>✕</button>
    </div>
  );
}
