import React, { useMemo, useState } from 'react';

export default function Teams({ teams = [], loading, onCreateTeam }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [teams]);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const ok = await onCreateTeam({ name: name.trim(), description: description.trim() });
      if (ok) { setName(''); setDescription(''); setShowForm(false); }
      else setError('The team was not saved. Check the workspace error message above and try again.');
    } catch {
      setError('The team could not be saved. Try again.');
    } finally { setSaving(false); }
  };

  return <div className="page management-page">
    <div className="page-heading-row"><div><div className="eyebrow">WORKSPACE / COLLABORATION</div><h1>Teams</h1><p>Organize projects under a workspace team. Team records are saved through the ORBIT API.</p></div><button type="button" className="btn btn-primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cancel' : '＋ New team'}</button></div>
    {showForm && <section className="surface-card management-form"><div className="surface-card-header"><div><h2>Create a team</h2><p>Add a team record to your workspace</p></div></div>
      <form onSubmit={submit}><div className="form-grid"><div className="form-group"><label htmlFor="team-name">Team name</label><input id="team-name" value={name} onChange={event => setName(event.target.value)} required maxLength={120} placeholder="e.g. Platform engineering" /></div><div className="form-group"><label htmlFor="team-description">Description</label><input id="team-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} placeholder="What does this team own?" /></div></div>{error && <p className="inline-form-error" role="alert">{error}</p>}<div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Create team'}</button></div></form>
    </section>}
    <div className="management-summary-row"><div className="summary-counter-card"><span>Teams</span><strong>{teams.length}</strong></div><div className="summary-counter-card"><span>Projects linked by team</span><strong>—</strong><small>Project counts are not returned by this API</small></div></div>
    <section className="surface-card management-list-card"><div className="surface-card-header"><div><h2>Your teams</h2><p>{teams.length} team record{teams.length === 1 ? '' : 's'} in this workspace</p></div></div>
      {loading && !teams.length ? <div className="empty-list-state">Loading team records…</div> : sortedTeams.length ? <div className="team-list">{sortedTeams.map(team => <article className="team-list-item" key={team.id}><div className="team-avatar">{String(team.name || 'T').trim().charAt(0).toUpperCase()}</div><div className="team-list-copy"><strong>{team.name}</strong><p>{team.description || 'No description provided.'}</p><small>Team ID {team.id}{team.owner_name ? ' · Owner ' + team.owner_name : ''}</small></div><span className="status-pill blue">Workspace team</span></article>)}</div> : <div className="empty-list-state"><span className="empty-state-icon">♧</span><h3>No teams found</h3><p>Create a team to start organizing your project inventory.</p><button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>Create a team</button></div>}
    </section>
  </div>;
}
