import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { remoteMcpAuth } from '@/lib/server/remote-mcp';
import { McpConsent } from '@/components/mcp-consent';

export default async function ConsentPage() {
  const mcp = remoteMcpAuth();
  if (!auth || !mcp) notFound();
  const session = await auth.getSession({ query: { disableCookieCache: 'true' } });
  if (!session.data?.user?.emailVerified) redirect('/auth/account');
  return <McpConsent resource={mcp.resource} />;
}
