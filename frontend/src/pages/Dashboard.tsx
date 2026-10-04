import { useState } from 'react';
import {
  User, Building2, List, Heart, MessageSquare, Settings, Sparkles,
  LayoutDashboard, ChevronRight, Bell, Clock, ShieldCheck,
} from 'lucide-react';
import type { PageProps } from '../types';
import { inquiries } from '../data/demo';
import { useAuth } from '../context/AuthContext';
import { useOneId } from '../context/OneIdContext';
import OneIdCard from '../components/OneIdCard';
import OneIdBadge from '../components/OneIdBadge';
import VisibilitySettings from '../components/VisibilitySettings';

type DashSection = 'overview' | 'profile' | 'businesses' | 'listings' | 'saved' | 'inquiries' | 'ai' | 'settings';

const navItems: { key: DashSection; icon: React.ElementType; label: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { key: 'profile', icon: User, label: 'My Profile' },
  { key: 'businesses', icon: Building2, label: 'My Businesses' },
  { key: 'listings', icon: List, label: 'My Listings' },
  { key: 'saved', icon: Heart, label: 'Saved' },
  { key: 'inquiries', icon: MessageSquare, label: 'Inquiries' },
  { key: 'ai', icon: Sparkles, label: 'AI Assistant' },
  { key: 'settings', icon: Settings, label: 'Settings' },
];

const statCards = [
  { label: 'Active Listings', value: '2', sub: 'Sample data', color: 'bg-brand-50 text-brand-700' },
  { label: 'Saved Items', value: '4', sub: 'Sample data', color: 'bg-gold-50 text-gold-700' },
  { label: 'New Inquiries', value: '3', sub: 'Sample data', color: 'bg-green-50 text-green-700' },
  { label: 'Drafts', value: '1', sub: 'Sample data', color: 'bg-purple-50 text-purple-700' },
];

const activity = [
  { text: 'Zahra K. sent an inquiry about Demo Photography Studio', time: '2 hours ago', icon: MessageSquare },
  { text: 'Your listing "Demo Photography Studio" was viewed 12 times', time: '5 hours ago', icon: Building2 },
  { text: 'Imran T. sent an inquiry about Demo Photography Studio', time: '1 day ago', icon: MessageSquare },
  { text: 'Draft listing "Wedding Videography Package" was saved', time: '2 days ago', icon: List },
];

export default function Dashboard({ navigate }: PageProps) {
  const [section, setSection] = useState<DashSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const oneId = useOneId();

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface flex">
      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-100 pt-16 lg:pt-6 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* User pill */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-brand-200 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-brand-700" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-brand-900 truncate">{user?.name ?? 'Demo User'}</div>
              <div className="text-xs text-brand-400 flex items-center gap-1.5">Community Member{oneId.visibility.showBadge && <OneIdBadge state={oneId.state === 'expiring' ? 'active' : oneId.state} size="icon" />}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setSection(key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                section === key
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {key === 'inquiries' && (
                <span className="ml-auto text-xs bg-brand-700 text-white rounded-full px-1.5 py-0.5">3</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <button
            onClick={() => navigate('ai-listing')}
            className="w-full flex items-center gap-2 justify-center py-2.5 bg-brand-800 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-gold-300" />
            New Listing
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-auto">
        {/* Mobile header */}
        <div className="flex items-center gap-3 mb-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl border border-gray-200 text-gray-600"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-brand-900 text-xl capitalize">{section.replace('-', ' ')}</h1>
        </div>

        {section === 'overview' && (
          <div>
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-2xl font-bold text-brand-900">Dashboard Overview</h1>
                <p className="text-gray-500 text-sm mt-0.5">Welcome back, Demo User · [Sample data]</p>
              </div>
              <button className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
            </div>

            {oneId.enabled && !oneId.loading && oneId.state === 'none' && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldCheck className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  <p className="text-sm text-brand-900">Link your One ID to show you are a verified Jamaat member.</p>
                </div>
                <button onClick={() => setSection('profile')} className="flex-shrink-0 px-4 py-2 bg-brand-800 text-white text-xs font-semibold rounded-xl hover:bg-brand-700">Link One ID</button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className={`text-3xl font-display font-bold mb-1 ${s.color.split(' ')[1]}`}>{s.value}</div>
                  <div className="text-gray-700 font-medium text-sm">{s.label}</div>
                  <div className="text-gray-400 text-xs mt-0.5">[{s.sub}]</div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <h2 className="font-display font-semibold text-brand-900 text-base mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <a.icon className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('ai-listing')}
                className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                    <Sparkles className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-800 text-sm">Create Listing with AI</div>
                    <div className="text-xs text-gray-400">Generate a polished draft in minutes</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
              </button>
              <button
                onClick={() => navigate('ai-assistant')}
                className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center group-hover:bg-gold-100 transition-colors">
                    <MessageSquare className="w-5 h-5 text-gold-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-800 text-sm">Ask AI Assistant</div>
                    <div className="text-xs text-gray-400">Discover businesses and listings</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {section === 'inquiries' && (
          <div>
            <h1 className="hidden lg:block font-display text-2xl font-bold text-brand-900 mb-6">Inquiries</h1>
            <div className="space-y-4">
              {inquiries.map(inq => (
                <div key={inq.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{inq.from}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inq.status === 'Unread' ? 'bg-brand-100 text-brand-700' :
                          inq.status === 'Replied' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{inq.status}</span>
                      </div>
                      <div className="text-xs text-brand-600 mt-0.5">{inq.business}</div>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {inq.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 italic">"{inq.message}"</p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-4 py-1.5 bg-brand-800 text-white text-xs font-medium rounded-xl hover:bg-brand-700 transition-colors">Reply</button>
                    <button className="px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition-colors">Mark as read</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'profile' && (
          <div className="max-w-2xl space-y-5">
            <h1 className="hidden lg:block font-display text-2xl font-bold text-brand-900">My Profile</h1>
            {user && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-display font-bold text-brand-700 text-xl">{user.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-brand-900 truncate">{user.name}</div>
                    <div className="text-sm text-gray-500 truncate">{user.email}{user.city ? ` · ${user.city}` : ''}</div>
                  </div>
                </div>
              </section>
            )}
            <OneIdCard />
            <VisibilitySettings />
            {!oneId.enabled && <p className="text-sm text-gray-400">One ID is not enabled in this build.</p>}
          </div>
        )}

        {section !== 'overview' && section !== 'inquiries' && section !== 'profile' && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Settings className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-display font-semibold text-gray-700 text-lg mb-2 capitalize">{section}</h3>
            <p className="text-gray-400 text-sm">[This section would be fully built in the production version of KhojaSphere.]</p>
          </div>
        )}
      </main>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
