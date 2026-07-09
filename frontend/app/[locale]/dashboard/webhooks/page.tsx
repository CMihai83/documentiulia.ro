import { redirect } from 'next/navigation';

/**
 * Deduped (REQ-034): this standalone page was an orphaned, mock-heavy twin of the
 * API-backed /dashboard/developer/webhooks. Redirect preserves any old links.
 */
export default async function WebhooksRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/developer/webhooks`);
}
