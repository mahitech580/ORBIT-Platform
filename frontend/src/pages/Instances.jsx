import React, { useMemo, useState } from 'react';

export default function Instances({ instances = [], projects = [], deployments = [], loading, onCreateInstance }) {
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [deploymentId, setDeploymentId] = useState('');
  const [name, setName] = useState('');
  const [instanceType, setInstanceType] = useState('t3.medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const availableProjects = useMemo(() => projects.filter(project => deployments.some(item => Number(item.project_id) === Number(project.id))), [projects, deployments]);
  const projectDeployments = useMemo(() => deployments.filter(item => Number(item.project_id) === Number(projectId)), [deployments, projectId]);
  const sortedInstances = useMemo(() => [...instances].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [instances]);

  const openForm = () => {
    const firstProject = availableProjects[0];
    const firstDeployment = firstProject && deployments.find(item => Number(item.project_id) === Number(firstProject.id));
    setProjectId(firstProject ? String(firstProject.id) : '');
    setDeploymentId(firstDeployment ? String(firstDeployment.id) : '');
    setName('');
    setError('');
    setShowForm(true);
  };
  const handleProjectChange = value => {
    setProjectId(value);
    const recent = deployments.find(item => Number(item.project_id) === Number(value));
    setDeploymentId(recent ? String(recent.id) : '');
  };
  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!projectId || !deploymentId) { setError('Choose a project with a deployment record first.'); return; }
    setSaving(true);
    try {
      const ok = await onCreateInstance({ project_id: Number(projectId), deployment_id: Number(deploymentId), name: name.trim(), instance_type: instanceType });
      if (ok) { setShowForm(false); setName(''); }
      else setError('The instance record could not be saved. Review the workspace error message and try again.');
    } catch {
      setError('The instance record could not be saved. Try again.');
    } finally { setSaving(false); }
  };

  return <div className="page management-page">
    <div className="page-heading-row"><div><div className="eyebrow">WORKSPACE / RESOURCE RECORDS</div><h1>Instances</h1><p>Review instance metadata associated with deployment records.</p></div><button type="button" className="btn btn-primary" disabled={!availableProjects.length} onClick={openForm}>＋ Add instance record</button></div>
    <div className="capability-notice"><span className="notice-icon">i</span><p><strong>Tracking only:</strong> adding an instance saves a metadata record. This version does not launch a virtual machine or provision a cloud resource.</p></div>
    {showForm && <section className="surface-card management-form"><div className="surface-card-header"><div><h2>Add instance record</h2><p>Link the record to an existing project deployment</p></div><button type="button" className="icon-text-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
      <form onSubmit={submit}><div className="form-grid"><div className="form-group"><label htmlFor="instance-project">Project</label><select id="instance-project" value={projectId} onChange={event => handleProjectChange(event.target.value)} required>{availableProjects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></div><div className="form-group"><label htmlFor="instance-deployment">Deployment record</label><select id="instance-deployment" value={deploymentId} onChange={event => setDeploymentId(event.target.value)} required>{projectDeployments.map(item => <option value={item.id} key={item.id}>#{item.id} · {item.version} · {item.status}</option>)}</select></div><div className="form-group"><label htmlFor="instance-name">Record name</label><input id="instance-name" value={name} onChange={event => setName(event.target.value)} maxLength={120} required placeholder="e.g. api-worker-01" /></div><div className="form-group"><label htmlFor="instance-type">Instance type</label><select id="instance-type" value={instanceType} onChange={event => setInstanceType(event.target.value)}><option>t3.micro</option><option>t3.small</option><option>t3.medium</option><option>t3.large</option><option>custom</option></select></div></div>{error && <p className="inline-form-error" role="alert">{error}</p>}<div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save instance record'}</button></div></form>
    </section>}
    <div className="management-summary-row"><div className="summary-counter-card"><span>Instance records</span><strong>{instances.length}</strong></div><div className="summary-counter-card"><span>Projects with a deployment</span><strong>{availableProjects.length}</strong></div><div className="summary-counter-card"><span>Resource provisioning</span><strong className="summary-text-value">Disabled</strong></div></div>
    <section className="surface-card management-list-card"><div className="surface-card-header"><div><h2>Instance inventory</h2><p>Stored records returned by the API</p></div><span className="record-origin-label">API DATA</span></div>
      {loading && !instances.length ? <div className="empty-list-state">Loading instance records…</div> : sortedInstances.length ? <div className="responsive-table-wrap"><table className="dashboard-table"><thead><tr><th>Name</th><th>Project</th><th>Type</th><th>Recorded state</th><th>Deployment</th></tr></thead><tbody>{sortedInstances.map(instance => <tr key={instance.id}><td><strong className="table-strong-text">{instance.name || 'Instance record'}</strong><small className="table-subline">Record #{instance.id}</small></td><td>{instance.project_name || projects.find(project => Number(project.id) === Number(instance.project_id))?.name || '—'}</td><td><span className="code-value">{instance.instance_type || '—'}</span></td><td><span className="status-pill blue">{instance.status || 'recorded'}</span></td><td className="muted-cell">#{instance.deployment_id || '—'}</td></tr>)}</tbody></table></div> : <div className="empty-list-state"><span className="empty-state-icon">▧</span><h3>No instance records</h3><p>Create a deployment record first, then add instance metadata associated with it.</p><button type="button" className="btn btn-secondary" onClick={openForm} disabled={!availableProjects.length}>Add instance record</button></div>}
    </section>
  </div>;
}
