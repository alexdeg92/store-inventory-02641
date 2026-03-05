'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import { getSessionEmployee, clearSession } from '@/lib/employees';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const emp = getSessionEmployee();
    if (!emp || emp.role !== 'admin') {
      router.replace('/');
    }
  }, [router]);

  function logout() {
    clearSession();
    router.push('/');
  }

  return <AdminDashboard onLogout={logout} />;
}
