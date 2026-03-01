'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin-auth') !== '1') {
      router.replace('/');
    }
  }, [router]);

  function logout() {
    sessionStorage.clear();
    router.push('/');
  }

  return <AdminDashboard onLogout={logout} />;
}
