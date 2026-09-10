import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import type { BadgeVariant } from '@/components/ui/Badge';

const roleVariant: Record<string, BadgeVariant> = {
  ATTENDEE: 'success', ORGANIZER: 'info', VENDOR: 'purple', ADMIN: 'warning', PLATFORM_ADMIN: 'danger', MANAGEMENT: 'amber',
};

const USERS = [
  { id: 'u1', firstname: 'Sipho',   lastname: 'Mahlangu',  email: 'sipho@example.com',   role: 'ORGANIZER',  isActive: true,  joined: '12 Jan 2025' },
  { id: 'u2', firstname: 'Fatima',  lastname: 'Osman',     email: 'fatima@example.com',  role: 'ATTENDEE',   isActive: true,  joined: '03 Feb 2025' },
  { id: 'u3', firstname: 'James',   lastname: 'van Wyk',   email: 'james@example.com',   role: 'VENDOR',     isActive: true,  joined: '18 Feb 2025' },
  { id: 'u4', firstname: 'Lerato',  lastname: 'Dlamini',   email: 'lerato@example.com',  role: 'ORGANIZER',  isActive: false, joined: '22 Mar 2025' },
  { id: 'u5', firstname: 'Priya',   lastname: 'Govender',  email: 'priya@example.com',   role: 'ORGANIZER',  isActive: true,  joined: '01 Apr 2025' },
  { id: 'u6', firstname: 'Thabo',   lastname: 'Nkosi',     email: 'thabo@example.com',   role: 'ATTENDEE',   isActive: true,  joined: '14 Apr 2025' },
];

export default function UserManagement() {
  const [search, setSearch] = useState('');

  const filtered = USERS.filter(u => {
    const q = search.toLowerCase();
    return `${u.firstname} ${u.lastname}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <PageWrapper>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">User Management</h1>
          <p className="text-neutral-500 mt-1">{USERS.length} registered users</p>
        </div>
        <div className="w-full sm:w-72">
          <Input placeholder="Search by name, email or role…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold flex items-center justify-center shrink-0">
                        {u.firstname.charAt(0)}
                      </div>
                      <span className="font-medium text-neutral-900">{u.firstname} {u.lastname}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge variant={roleVariant[u.role] ?? 'default'}>{u.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{u.joined}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit role</button>
                      <span className="text-neutral-300">·</span>
                      <button className={`text-xs font-medium ${u.isActive ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}`}>
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">No users match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
