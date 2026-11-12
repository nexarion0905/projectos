import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { CloudWorkspace } from '@/components/cloud-workspace';
import Link from 'next/link';

export default async function CloudPage() {
  if (!auth) return <main className="auth-shell"><section className="auth-card">
    <h1>Cloud workspaces unavailable</h1>
    <p>This installation is running in local mode.</p>
    <Link href="/">Open local workspace</Link>
  </section></main>;
  const session = await auth.getSession({ query: { disableCookieCache: 'true' } });
  if (!session.data?.user) redirect('/auth/sign-in');
  if (!session.data.user.emailVerified) redirect('/auth/account');
  return <CloudWorkspace />;
}
