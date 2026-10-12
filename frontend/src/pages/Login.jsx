import React, { useState } from 'react';

export default function Login({ onLogin, api }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('demo@orbit.local');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { email: email.trim(), password };
      if (isRegister) {
        payload.username = username.trim();
        payload.first_name = firstName.trim();
      }
      const response = await api.post(isRegister ? '/auth/register' : '/auth/login', payload);
      onLogin(response.data.token, response.data.user);
    } catch (requestError) {
      setError(requestError.response?.data?.error || (isRegister
        ? 'Registration failed. Check the API connection and try again.'
        : 'Sign-in failed. Check your credentials and API connection.'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = nextMode => {
    setMode(nextMode);
    setError('');
    if (nextMode === 'register') setPassword('');
    else setPassword('demo123');
  };

  return (
    <div className="login-page">
      <div className="login-layout">
        <section className="login-story">
          <div className="orbit-mark"><span>O</span><i /></div>
          <p className="eyebrow">PLATFORM 2.0</p>
          <h1>Ship with clarity.</h1>
          <p className="login-story-copy">One workspace for your projects, deployment records, and performance telemetry.</p>
          <div className="login-feature-list">
            <div><span className="feature-dot" /> Project inventory and runtime details</div>
            <div><span className="feature-dot" /> Deployment history and status</div>
            <div><span className="feature-dot" /> Per-project metrics and trends</div>
          </div>
          <div className="login-footnote">Control-plane preview · Cloud provisioning is not enabled in this release</div>
        </section>

        <section className="login-container">
          <div className="login-card">
            <p className="eyebrow">{isRegister ? 'CREATE WORKSPACE ACCESS' : 'WELCOME BACK'}</p>
            <h2>{isRegister ? 'Create your account' : 'Sign in to ORBIT'}</h2>
            <p className="login-subtitle">{isRegister
              ? 'Your account receives a private default team.'
              : 'Continue to your project operations workspace.'}</p>

            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''} onClick={() => switchMode('register')}>Create account</button>
            </div>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <>
                  <div className="form-group">
                    <label htmlFor="first-name">First name</label>
                    <input id="first-name" type="text" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" maxLength={100} placeholder="Your first name" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input id="username" type="text" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={50} pattern="[A-Za-z0-9_.-]{3,50}" required placeholder="e.g. mahitech" />
                    <small>3–50 letters, numbers, dots, underscores, or hyphens</small>
                  </div>
                </>
              )}
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required maxLength={255} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : 1} required placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'} />
              </div>

              {error && <div className="error-message" role="alert">{error}</div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? 'Please wait…' : (isRegister ? 'Create account' : 'Sign in to ORBIT')}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {!import.meta.env.PROD && (
              <div className="login-info">
                <span className="demo-label">LOCAL DEMO</span>
                <p>Use demo@orbit.local with password demo123, or create a separate account.</p>
              </div>
            )}
          </div>
          <p className="auth-legal">Use a unique password. Demo authentication is intended for local development only.</p>
        </section>
      </div>
    </div>
  );
}
