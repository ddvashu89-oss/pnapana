'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Keep old bookmarks from reaching the retired Plant Buddy feature. */
export default function RetiredBuddyRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/');
  }, [router]);

  return (
    <main style={{ maxWidth: 640, margin: '12vh auto', padding: 24, textAlign: 'center' }}>
      <h1>Plant Buddy is no longer available</h1>
      <p style={{ margin: '12px 0 20px', color: 'var(--text-secondary)' }}>Return to your garden dashboard to continue caring for your plants.</p>
      <Link href="/dashboard/">Back to dashboard</Link>
    </main>
  );
}
