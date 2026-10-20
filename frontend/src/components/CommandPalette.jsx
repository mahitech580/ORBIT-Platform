import React, { useEffect, useMemo, useRef, useState } from 'react';
import { nextCommandIndex } from '../utils/commandPaletteNavigation.js';

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

  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, []);
  useEffect(() => { setActiveIndex(0); }, [query]);

  const handleKeyDown = event => {
    if (event.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable?.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => nextCommandIndex(index, 'down', results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => nextCommandIndex(index, 'up', results.length));
    } else if (event.key === 'Enter' && event.target === inputRef.current && results[activeIndex]) {
      event.preventDefault();
      onSelect(results[activeIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return <div className="command-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title" onKeyDown={handleKeyDown}>
      <div className="command-search-row">
        <span aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search ORBIT workspace…"
          aria-label="Search workspace pages"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results[activeIndex] ? 'command-option-' + results[activeIndex].id : undefined}
          autoComplete="off"
        />
        <button type="button" onClick={onClose} className="command-escape">Esc</button>
      </div>
      <div id="command-results" className="command-results" role="listbox" aria-labelledby="command-title">
        <p id="command-title" className="command-section-label">{query ? 'MATCHING PAGES' : 'QUICK NAVIGATION'}</p>
        {results.length ? results.map((item, index) => <div
          key={item.id}
          id={'command-option-' + item.id}
          role="option"
          aria-selected={activeIndex === index}
          className={'command-item' + (activeIndex === index ? ' active' : '')}
          onMouseDown={event => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect(item.id)}
        ><span className="command-item-icon" aria-hidden="true">{item.icon}</span><span className="command-item-copy"><strong>{item.label}</strong><small>{item.description}</small></span><span className="command-item-enter" aria-hidden="true">{activeIndex === index ? '↵' : ''}</span></div>) : <div className="command-no-results"><strong>No pages found</strong><small>Try projects, deployments, metrics, teams, or instances.</small></div>}
      </div>
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span>ORBIT WORKSPACE</span></div>
    </section>
  </div>;
}
