import { useState } from 'react';
import {
  Users, Building2, MapPin, Tag, Flag, LayoutDashboard,
  Eye, EyeOff, Check, AlertCircle, ShieldCheck,
} from 'lucide-react';
import type { PageProps } from '../types';
import { reportedListings } from '../data/demo';

type AdminSection = 'overview' | 'users' | 'businesses' | 'properties' | 'marketplace' | 'reports' | 'categories';

const sidebarItems: { key: AdminSection; icon: React.ElementType; label: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'businesses', icon: Building2, label: 'Businesses' },
  { key: 'properties', icon: MapPin, label: 'Properties' },
  { key: 'marketplace', icon: Tag, label: 'Marketplace' },
  { key: 'reports', icon: Flag, label: 'Reports' },
  { key: 'categories', icon: LayoutDashboard, label: 'Categories' },
];

const statCards = [
  { label: 'Total Users', value: '284', note: 'sample', icon: Users, color: 'text-brand-700 bg-brand-50' },
  { label: 'Total Businesses', value: '1,247', note: 'sample', icon: Building2, color: 'text-blue-700 bg-blue-50' },
  { label: 'Property Listings', value: '832', note: 'sample', icon: MapPin, color: 'text-green-700 bg-green-50' },
  { label: 'Marketplace Items', value: '2,411', note: 'sample', icon: Tag, color: 'text-purple-700 bg-purple-50' },
  { label: 'Open Reports', value: '4', note: 'sample', icon: Flag, color: 'text-red-700 bg-red-50' },
];

const statusStyles: Record<string, string> = {
  'Pending Review': 'bg-yellow-100 text-yellow-700',
  'Under Review': 'bg-blue-100 text-blue-700',
  'Resolved': 'bg-green-100 text-green-700',
};

export default function Admin({ navigate }: PageProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [reports, setReports] = useState(reportedListings);

  const updateStatus = (id: number, status: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface flex">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-100 pt-6 flex-col flex-shrink-0">
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {sidebarItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                section === key
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {key === 'reports' && (
                <span className="ml-auto text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5">
                  {reports.filter(r => r.status !== 'Resolved').length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <button
            onClick={() => navigate('home')}
            className="w-full py-2.5 text-xs text-gray-500 hover:text-brand-700 transition-colors"
          >
            ← Back to KhojaSphere
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-auto">
        {/* Mobile section tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 lg:hidden">
          {sidebarItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                section === key ? 'bg-brand-800 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === 'overview' && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div>
                <h1 className="font-display text-2xl font-bold text-brand-900">Admin Overview</h1>
                <p className="text-gray-400 text-sm mt-0.5">Moderation dashboard · [All figures are sample/demo data]</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {statCards.map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="font-display font-bold text-xl text-gray-800">{s.value}</div>
                  <div className="text-gray-600 text-xs font-medium mt-0.5">{s.label}</div>
                  <div className="text-gray-400 text-xs">[{s.note}]</div>
                </div>
              ))}
            </div>

            {/* Reports table preview */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-display font-semibold text-brand-900">Pending Reports</h2>
                <button
                  onClick={() => setSection('reports')}
                  className="text-xs text-brand-600 hover:text-brand-800 transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Listing</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Reason</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 4).map(r => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{r.listing}</td>
                        <td className="px-4 py-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{r.type}</span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">{r.reason}</td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[r.status]}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => updateStatus(r.id, 'Under Review')}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Review"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => updateStatus(r.id, 'Resolved')}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                              title="Resolve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Hide listing"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Demo notice */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-sm">
                <strong>Demo dashboard:</strong> All users, listings, and reports shown here are sample data for demonstration purposes. No real moderation actions are taken.
              </p>
            </div>
          </div>
        )}

        {section === 'reports' && (
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-900 mb-6">Reports & Moderation</h1>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Listing</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Report Reason</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-800">{r.listing}</td>
                        <td className="px-4 py-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{r.type}</span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs hidden md:table-cell">{r.reason}</td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[r.status]}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-400 hidden sm:table-cell">{r.date}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => updateStatus(r.id, 'Under Review')}
                              className="px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => updateStatus(r.id, 'Resolved')}
                              className="px-2.5 py-1.5 text-xs text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              Resolve
                            </button>
                            <button className="px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                              Hide
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section !== 'overview' && section !== 'reports' && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-display font-semibold text-gray-700 text-lg mb-2 capitalize">{section} Management</h3>
            <p className="text-gray-400 text-sm">[This section would be fully built in the production version of KhojaSphere.]</p>
          </div>
        )}
      </main>
    </div>
  );
}
