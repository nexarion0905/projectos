'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/client';

type Client = { client_name?: string; client_id: string; redirect_uris?: string[] };

function redirectHost(uri: string) {
  try {
    const parsed = new URL(uri);
    return parsed.host || parsed.protocol;
  } catch {
    return 'Invalid redirect address';
  }
}

export function McpConsent({ resource }: { resource: string }) {
  const [request, setRequest] = useState<{ client: Client; scope: string }>();
  const [notice, setNotice] = useState('Checking the client…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('client_id');
    const scope = params.get('scope') ?? '';
    if (!id || params.get('resource') !== resource || !scope.split(' ').includes('openid')) {
      setNotice('This authorization request does not match the ProjectOS MCP resource.');
      return;
    }
    let active = true;
    void authClient.oauth2.publicClient({ query: { client_id: id } }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) { setNotice('Client information is unavailable. Restart from your MCP client.'); return; }
      setRequest({ client: data as Client, scope });
      setNotice('');
    }).catch(() => { if (active) setNotice('Authorization service unavailable.'); });
    return () => { active = false; };
  }, [resource]);

  async function respond(accept: boolean) {
    setBusy(true);
    setNotice('');
    try {
      const result = await authClient.oauth2.consent({ accept });
      if (result.error) throw result.error;
    } catch {
      setNotice('Authorization could not be completed. Restart from your MCP client.');
    } finally {
      setBusy(false);
    }
  }

  const redirects = request?.client.redirect_uris?.map(redirectHost) ?? [];
  const loopback = redirects.length > 0 && redirects.every((host) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host));
  return <main className="auth-shell"><section className="auth-card cloud-card">
    <h1>Authorize an MCP client</h1>
    {request && <>
      <p><strong>{request.client.client_name || request.client.client_id}</strong> is requesting read access to workspace and project metadata.</p>
      <p>Resource <code>{resource}</code></p>
      <p>Requested scopes <code>{request.scope}</code></p>
      <p>Redirect hosts {redirects.join(', ') || 'None listed'}</p>
      {loopback && <p>All redirects are local. Continue only if you started this request from your own device.</p>}
      <div className="auth-links">
        <button className="button-primary" disabled={busy} onClick={() => void respond(true)}>Allow</button>
        <button className="button-outline" disabled={busy} onClick={() => void respond(false)}>Deny</button>
      </div>
    </>}
    <p role="status">{notice}</p>
    <Link href="/cloud">Cloud workspaces</Link>
  </section></main>;
}
