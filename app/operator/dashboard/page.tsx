'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OperatorDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/operator'); }, [router]);
  return null;
}
