'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { parseBackup } from '@/features/core/validation';
import type { WorkspaceData } from '@/features/core/types';

type Workspace = { id: string; name: string; kind: 'personal' | 'team'; role: string };
type Member = { user_id: string; role: string };
type Snapshot = { data: WorkspaceData | null; version: number; updatedAt?: string };

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const result = await fetch(path, {
    method,
    cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (result.status === 401) {
    location.replace('/auth/sign-in');
    throw new Error('Your session ended.');
  }
  const data = await result.json();
  if (!result.ok) throw new Error(data.error ?? 'Cloud service unavailable.');
  return data as T;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Cloud service unavailable.';
}

export function CloudWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [accountId, setAccountId] = useState('');
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('Loading workspaces…');
  const [busy, setBusy] = useState(false);
  const workspace = workspaces.find((item) => item.id === selected);

  async function refresh(select?: string) {
    const data = await request<{ accountId: string; workspaces: Workspace[] }>('/api/workspaces');
    setWorkspaces(data.workspaces);
    setAccountId(data.accountId);
    setSelected((old) => select ?? (data.workspaces.some((item) => item.id === old) ? old : data.workspaces[0]?.id ?? ''));
  }

  useEffect(() => { void refresh().then(() => setNotice('')).catch((error) => setNotice(message(error))); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    try {
      const result = await request<{ workspaceId: string }>('/api/workspaces', 'POST', {
        name: fields.get('name'), kind: fields.get('kind'),
      });
      await refresh(result.workspaceId);
      form.reset();
      setNotice('Workspace opened.');
    } catch (error) { setNotice(message(error)); } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card cloud-card">
    <h1>Cloud workspaces</h1>
    <nav className="auth-links" aria-label="Workspace navigation">
      <Link href="/">Local workspace</Link>
      <Link href="/auth/account">Account and sign out</Link>
    </nav>
    {accountId && <p>Account ID <code>{accountId}</code></p>}
    {accountId && <McpAccessControl />}
    <p role="status">{notice}</p>
    <form className="auth-form" onSubmit={create}>
      <h2>Create a workspace</h2>
      <label className="field-label">Workspace name<input name="name" required maxLength={120} /></label>
      <label className="field-label">Workspace type<select name="kind"><option value="personal">Personal</option><option value="team">Team</option></select></label>
      <button className="button-primary" disabled={busy || !accountId}>Create workspace</button>
    </form>
    {workspaces.length > 0 && <label className="field-label">Open workspace<select value={selected} onChange={(event) => setSelected(event.target.value)}>
      {workspaces.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.role})</option>)}
    </select></label>}
    {workspace && <WorkspaceDetails key={workspace.id} workspace={workspace} />}
  </section></main>;
}

function McpAccessControl() {
  const [access, setAccess] = useState<{ available: boolean; enabled: boolean }>();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void request<{ available: boolean; enabled: boolean }>('/api/mcp-access').then(setAccess).catch((error) => setNotice(message(error)));
  }, []);

  if (!access?.available && !access?.enabled) return notice ? <p role="status">{notice}</p> : null;
  return <section className="auth-form">
    <h2>Remote MCP access</h2>
    <p>Allow approved MCP clients to read workspace and project metadata. Revoking access here takes effect on the next request.</p>
    <button className="button-outline" disabled={busy} onClick={() => {
      setBusy(true);
      void request<{ enabled: boolean }>('/api/mcp-access', 'PUT', { enabled: !access.enabled })
        .then((value) => setAccess({ ...access, enabled: value.enabled }))
        .catch((error) => setNotice(message(error)))
        .finally(() => setBusy(false));
    }}>{access.enabled ? 'Revoke remote MCP access' : 'Enable remote MCP access'}</button>
    <p role="status">{notice}</p>
  </section>;
}

function WorkspaceDetails({ workspace }: { workspace: Workspace }) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [members, setMembers] = useState<Member[]>([]);
  const [notice, setNotice] = useState('Loading cloud backup…');
  const [busy, setBusy] = useState(false);
  const base = `/api/workspaces/${workspace.id}`;
  const manages = workspace.kind === 'team' && ['owner', 'admin'].includes(workspace.role);
  const writes = ['owner', 'admin', 'editor'].includes(workspace.role);

  async function reload() {
    setSnapshot(await request<Snapshot>(`${base}/snapshot`));
    if (manages) setMembers((await request<{ members: Member[] }>(`${base}/members`)).members);
  }

  useEffect(() => { void reload().then(() => setNotice('')).catch((error) => setNotice(message(error))); }, [base, manages]);

  async function perform(action: () => Promise<void>, success: string) {
    setBusy(true);
    try { await action(); setNotice(success); } catch (error) { setNotice(message(error)); } finally { setBusy(false); }
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get('backup');
    if (!snapshot || !(file instanceof File) || file.size === 0 || file.size > 900_000) {
      setNotice('Choose a ProjectOS JSON backup under 900 KB.');
      return;
    }
    if (!window.confirm(`Upload this backup to ${workspace.name}? Members with workspace access can read its contents.`)) return;
    void perform(async () => {
      const backup = JSON.parse(await file.text());
      parseBackup(backup);
      await request(`${base}/snapshot`, 'PUT', { backup, expectedVersion: snapshot.version });
      form.reset();
      await reload();
    }, 'Backup uploaded.');
  }

  function download() {
    if (!snapshot?.data) return;
    const file = new Blob([JSON.stringify({
      app: 'ProjectOS', schemaVersion: 1, exportedAt: snapshot.updatedAt ?? new Date().toISOString(), data: snapshot.data,
    })], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'projectos-cloud-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="auth-form">
    <h2>Workspace backup</h2>
    <p>Export from the local workspace in Settings before uploading. Review the file for private information. Downloading leaves this device’s records untouched until you import it in Settings.</p>
    {snapshot && <p>{snapshot.data ? `Backup version ${snapshot.version} · ${snapshot.data.projects.length} projects` : 'No backup uploaded.'}</p>}
    <div className="auth-links">
      <button disabled={busy} onClick={() => void perform(reload, 'Workspace refreshed.')}>Refresh</button>
      <button disabled={busy || !snapshot?.data} onClick={download}>Download backup</button>
    </div>
    {writes && <form className="auth-form" onSubmit={upload}>
      <label className="field-label">ProjectOS backup file<input type="file" name="backup" accept="application/json,.json" required /></label>
      <button className="button-primary" disabled={busy || !snapshot}>Upload backup</button>
    </form>}
    {manages && <>
      <h2>Team members</h2>
      <ul>{members.map((member) => <li key={member.user_id}>
        <code>{member.user_id}</code> · {member.role}{' '}
        {(member.role !== 'owner' && (workspace.role === 'owner' || member.role !== 'admin')) &&
          <button className="button-outline" disabled={busy} onClick={() => {
            if (!window.confirm('Remove this member from the workspace?')) return;
            void perform(async () => {
              await request(`${base}/members`, 'DELETE', { userId: member.user_id });
              await reload();
            }, 'Member removed.');
          }}>Remove</button>}
      </li>)}</ul>
      <form className="auth-form" onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        void perform(async () => {
          await request(`${base}/members`, 'POST', { userId: fields.get('userId'), role: fields.get('role') });
          await reload();
        }, 'Membership saved.');
      }}>
        <label className="field-label">Member account ID<input name="userId" required maxLength={180} /></label>
        <label className="field-label">Member role<select name="role">
          <option value="viewer">Viewer</option><option value="reviewer">Reviewer</option><option value="editor">Developer</option>
          {workspace.role === 'owner' && <option value="admin">Administrator</option>}
        </select></label>
        <button className="button-primary" disabled={busy}>Save membership</button>
      </form>
    </>}
    <p role="status">{notice}</p>
  </section>;
}
