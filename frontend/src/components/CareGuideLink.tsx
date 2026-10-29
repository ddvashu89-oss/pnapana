'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// The public marketing nav's "Care Guide" link used to point at /care, which is
// a login-gated app route (the signed-in user's personal watering task list) —
// an anonymous visitor clicking it just got silently redirected to /login.
// This resolves to the right destination for whoever is actually looking:
// admins get the admin Care Guide page, everyone else gets the public one.
export default function CareGuideLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const [href, setHref] = useState('/care-guide');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    try {
      const user = JSON.parse(stored);
      if (user?.is_admin) setHref('/admin/care-guide');
    } catch {
      // malformed localStorage value — fall back to the public page
    }
  }, []);

  return <Link href={href} className={className}>{children}</Link>;
}
