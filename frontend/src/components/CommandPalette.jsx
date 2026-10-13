import React, { useEffect, useMemo, useRef, useState } from 'react';

const commands = [
  { id: 'dashboard', label: 'Open dashboard', description: 'Workspace summary and live record activity', icon: '⌂' },
  { id: 'projects', label: 'Open projects', description: 'Create, search, edit, and archive projects', icon: '▤' },
  { id: 'deployments', label: 'Open deployments', description: 'Record and review release history', icon: '↗' },
  { id: 'metrics', label: 'Open metrics', description: 'Inspect available measurements', icon: '⌁' },
  { id: 'teams', label: 'Manage teams', description: 'View and create workspace teams', icon: '♧' },
  { id: 'instances', label: 'Manage instances', description: 'Track instance records by project', icon: '▧' },
  { id: 'settings', label: 'Workspace settings', description: 'Change appearance and refresh preferences', icon: '⚙' }
];

export default function CommandPalette({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? commands.filter(command => (command.label + ' ' + command.description + ' ' + command.id).toLowerCase().includes(needle))
      : commands;
  }, [query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIndex(0); }, [query]);

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

  return <div className="command-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title">
      <div className="command-search-row">
        <span aria-hidden="true">⌕</span>
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search ORBIT workspace…" aria-label="Search workspace pages" autoComplete="off" />
        <button type="button" onClick={onClose} className="command-escape">Esc</button>
      </div>
      <div className="command-results">
        <p id="command-title" className="command-section-label">{query ? 'MATCHING PAGES' : 'QUICK NAVIGATION'}</p>
        {results.length ? results.map((item, index) => <button
          key={item.id}
          type="button"
          className={'command-item' + (activeIndex === index ? ' active' : '')}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect(item.id)}
        ><span className="command-item-icon">{item.icon}</span><span className="command-item-copy"><strong>{item.label}</strong><small>{item.description}</small></span><span className="command-item-enter">{activeIndex === index ? '↵' : ''}</span></button>) : <div className="command-no-results"><strong>No pages found</strong><small>Try projects, deployments, metrics, teams, or instances.</small></div>}
      </div>
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span>ORBIT WORKSPACE</span></div>
    </section>
  </div>;
}
