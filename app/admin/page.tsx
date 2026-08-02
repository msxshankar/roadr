import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getSessionUser(token);
  if (!user) redirect('/?auth=required');
  if (user.role !== 'admin') redirect('/?auth=forbidden');
  return <AdminDashboard currentUser={user} />;
}
