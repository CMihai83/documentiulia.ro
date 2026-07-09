import { redirect } from 'next/navigation';

/**
 * Deduped (REQ-034): this route was a near-identical twin of /dashboard/e-invoice
 * (the page the sidebar links to). Kept as a redirect so old links keep working.
 */
export default async function EfacturaRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/e-invoice`);
}
