import React from 'react';

export default function TitleBar() {
  return (
    <div className="titlebar" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="titlebar-title">SmartToDo</div>
      <div className="titlebar-controls" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button className="titlebar-btn" onClick={() => window.api.window.minimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="2" fill="currentColor"/></svg>
        </button>
        <button className="titlebar-btn" onClick={() => window.api.window.maximize()}>
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
        </button>
        <button className="titlebar-btn titlebar-btn-close" onClick={() => window.api.window.close()}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
      </div>
    </div>
  );
}
