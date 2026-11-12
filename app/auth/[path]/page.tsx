'use client';

import Link from 'next/link';
import { use, useEffect, useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';

const titles: Record<string, string> = {
  'sign-in': 'Sign in to ProjectOS',
  'sign-up': 'Create your account',
  'forgot-password': 'Recover your account',
  'reset-password': 'Choose a new password',
  account: 'Your account',
};

function hasOAuthQuery() {
  const query = new URLSearchParams(location.search);
  return query.has('client_id') && query.get('response_type') === 'code';
}

export default function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = use(params);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; emailVerified: boolean } | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  useEffect(() => {
    if (path !== 'sign-in' || !hasOAuthQuery()) return;
    let active = true;
    void authClient.getSession().then(async ({ data }) => {
      if (!active || !data?.user?.emailVerified) return;
      const result = await authClient.oauth2.continue({ selected: true });
      if (active && result.error) setMessage('Restart authorization from your MCP client.');
    }).catch(() => { if (active) setMessage('Authorization is unavailable.'); });
    return () => { active = false; };
  }, [path]);
  useEffect(() => {
    if (path !== 'account') return;
    let active = true;
    void authClient.getSession().then((result) => {
      if (active) setUser(result.data?.user ?? null);
    }).catch(() => {
      if (active) setMessage('Account service unavailable.');
    }).finally(() => {
      if (active) setAccountLoaded(true);
    });
    return () => { active = false; };
  }, [path]);

  async function perform(action: () => Promise<void>, failure: string) {
    setMessage('');
    setBusy(true);
    try { await action(); } catch { setMessage(failure); } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '');
    const password = String(fields.get('password') ?? '');
    const name = String(fields.get('name') ?? '').trim();
    void perform(async () => {
      if (path === 'forgot-password') {
        await authClient.requestPasswordReset({ email, redirectTo: `${location.origin}/auth/reset-password` });
        setMessage('If this address can receive a recovery link, check your inbox.');
        return;
      }
      if (path === 'reset-password') {
        const token = new URLSearchParams(location.search).get('token');
        if (!token) { setMessage('Open the recovery link from your email.'); return; }
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error) throw result.error;
        location.replace('/auth/sign-in');
        return;
      }
      if (path === 'account') {
        if (!name) { setMessage('Enter a display name.'); return; }
        const result = await authClient.updateUser({ name });
        if (result.error) throw result.error;
        setMessage('Profile saved.');
        return;
      }
      if (path === 'sign-up') {
        const result = await authClient.signUp.email({ email, name, password, callbackURL: `${location.origin}/auth/account` });
        if (result.error) throw result.error;
        setMessage('Check your email for a verification link, then sign in.');
        return;
      }
      const result = await authClient.signIn.email({ email, password });
      if (result.error) throw result.error;
      if (result.data?.redirect) return;
      if (hasOAuthQuery()) {
        const continued = await authClient.oauth2.continue({ selected: true });
        if (continued.error) setMessage('Restart authorization from your MCP client.');
        return;
      }
      location.assign('/auth/account');
    }, path === 'sign-in' ? 'Sign-in failed. Check your details and verify your email.' : 'The request could not be completed. Try again.');
  }

  const account = path === 'account';
  const nameField = path === 'sign-up' || account;
  const passwordField = ['sign-in', 'sign-up', 'reset-password'].includes(path);
  return <main className="auth-shell"><section className="auth-card">
    <h1>{Object.hasOwn(titles, path) ? titles[path] : 'Account page unavailable'}</h1>
    {account && !accountLoaded && <p role="status">Checking your session…</p>}
    {account && accountLoaded && !user && <p>Sign in to manage your account.</p>}
    {account && user && <p>{user.email} · {user.emailVerified ? 'Verified' : 'Verification required'}</p>}
    {Object.hasOwn(titles, path) && (!account || user) && <form onSubmit={submit} className="auth-form">
      {nameField && <label className="field-label">Name<input name="name" required defaultValue={user?.name} maxLength={120} autoComplete="name" /></label>}
      {!account && path !== 'reset-password' && <label className="field-label">Email<input name="email" required type="email" autoComplete="email" /></label>}
      {passwordField && <label className="field-label">Password<input name="password" required type="password" minLength={path === 'sign-in' ? undefined : 8} maxLength={128} autoComplete={path === 'sign-in' ? 'current-password' : 'new-password'} /></label>}
      <button className="button-primary" disabled={busy}>{account ? 'Save profile' : path === 'forgot-password' ? 'Send recovery email' : titles[path]}</button>
    </form>}
    {account && user && <div className="auth-links">
      {!user.emailVerified && <button disabled={busy} onClick={() => void perform(async () => {
        const result = await authClient.sendVerificationEmail({ email: user.email, callbackURL: `${location.origin}/auth/account` });
        if (result.error) throw result.error;
        setMessage('Check your email for the verification link.');
      }, 'Verification email could not be sent.')}>Resend verification email</button>}
      <button disabled={busy} onClick={() => void perform(async () => {
        const result = await authClient.signOut();
        if (result.error) throw result.error;
        location.replace('/auth/sign-in');
      }, 'Sign-out failed. Try again.')}>Sign out</button>
      {user.emailVerified && <Link href="/cloud" prefetch={false}>Cloud workspaces</Link>}
    </div>}
    {message && <p className="auth-message" role="status">{message}</p>}
    <nav className="auth-links" aria-label="Account navigation">
      <Link href="/">Local workspace</Link>
      {path !== 'sign-in' && <Link href="/auth/sign-in">Sign in</Link>}
      {path === 'sign-in' && <><Link href="/auth/sign-up">Create an account</Link><Link href="/auth/forgot-password">Forgot password?</Link></>}
    </nav>
  </section></main>;
}
