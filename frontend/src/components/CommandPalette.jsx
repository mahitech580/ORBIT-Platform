import React, { useEffect, useMemo, useRef, useState } from 'react';

const commands = [
  { id: 'dashboard', label: 'Open overview', description: 'Workspace summary and release activity', icon: '⌂', group: 'Navigate' },
  { id: 'projects', label: 'Open projects', description: 'Manage project inventory and runtimes', icon: '▦', group: 'Navigate' },
  { id: 'deployments', label: 'Open deployments', description: 'Review and record release history', icon: '↗', group: 'Navigate' },
  { id: 'metrics', label: 'Open observability', description: 'Inspect recorded metrics and trends', icon: '⌁', group: 'Navigate' }
];

export default function CommandPalette({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(command => (command.label + ' ' + command.description + ' ' + command.id).toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(0, index - 1));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      onSelect(results[activeIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="command-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <div className="command-search-row">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.1 4.1" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages…"
            aria-label="Search workspace pages"
            autoComplete="off"
            spellCheck="false"
          />
          <button type="button" onClick={onClose} className="command-escape" aria-label="Close quick navigation">Esc</button>
        </div>
        <div className="command-results">
          <p id="command-title" className="command-section-label">{query ? 'SEARCH RESULTS' : 'QUICK NAVIGATION'}</p>
          {results.length ? results.map((command, index) => (
            <button
              key={command.id}
              type="button"
              className={'command-item' + (activeIndex === index ? ' active' : '')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onSelect(command.id)}
            >
              <span className="command-item-icon">{command.icon}</span>
              <span className="command-item-copy"><strong>{command.label}</strong><small>{command.description}</small></span>
              <span className="command-item-enter">{activeIndex === index ? '↵' : ''}</span>
            </button>
          )) : <div className="command-no-results"><span>⌕</span><strong>No pages found</strong><small>Try “projects”, “deployments”, or “metrics”.</small></div>}
        </div>
        <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span>ORBIT COMMANDS</span></div>
      </section>
    </div>
  );
}
