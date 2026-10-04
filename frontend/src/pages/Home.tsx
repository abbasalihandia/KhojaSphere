import { useState } from 'react';
import {
  Search, Mic, Sparkles, Camera, Calculator, Scale, Activity,
  Utensils, Calendar, Building2, Monitor, BookOpen, Plane,
  Briefcase, Wrench, ArrowRight, ChevronRight, MapPin, Heart,
  GraduationCap, Users, Target,
} from 'lucide-react';
import type { PageProps } from '../types';
import { businesses } from '../data/demo';

const categories = [
  { icon: Calculator, label: 'Accountants & CAs', count: '120+ listings' },
  { icon: Scale, label: 'Legal Services', count: '85+ listings' },
  { icon: Activity, label: 'Healthcare', count: '200+ listings' },
  { icon: Utensils, label: 'Restaurants & Food', count: '340+ listings' },
  { icon: Camera, label: 'Photography', count: '90+ listings' },
  { icon: Calendar, label: 'Event Services', count: '150+ listings' },
  { icon: Building2, label: 'Real Estate', count: '400+ listings' },
  { icon: Monitor, label: 'IT Services', count: '180+ listings' },
  { icon: BookOpen, label: 'Education', count: '110+ listings' },
  { icon: Plane, label: 'Travel', count: '70+ listings' },
  { icon: Briefcase, label: 'Consultants', count: '95+ listings' },
  { icon: Wrench, label: 'Home Services', count: '260+ listings' },
];

const queryChips = [
  'Find a photographer in Mumbai',
  'CA for GST',
  'Rental apartments in Andheri',
  'Catering for an event',
  'Used office furniture',
];

const aiConversation = [
  { role: 'user', text: 'I need a photographer for a wedding in Mumbai.' },
  {
    role: 'ai',
    text: 'Sure. Are you looking for photography only, photography and videography, or a complete wedding package?',
  },
];

const aiFilters = ['Mumbai', 'Wedding', 'Photography', 'Budget'];

const steps = [
  { n: '01', title: 'Search naturally', desc: 'Type your requirement in plain language—our AI understands context, location, and intent.' },
  { n: '02', title: 'Discover & compare', desc: 'Browse relevant community profiles, properties, and listings with all key details in one place.' },
  { n: '03', title: 'Connect directly', desc: 'Send an inquiry or save a listing. All contact is routed securely through KhojaSphere.' },
];

export default function Home({ navigate }: PageProps) {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<number[]>([]);

  const handleSearch = (q?: string) => {
    navigate('search', { query: q || query || 'photographers in Mumbai' });
  };

  const toggleSave = (id: number) => {
    setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="pt-16 pb-20 lg:pb-0">
      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-600">
          <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-sm px-4 py-2 rounded-full mb-8 backdrop-blur-sm border border-white/20">
            <Sparkles className="w-4 h-4 text-gold-400" />
            AI-Powered Community Discovery Platform
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            One Community.
            <br />
            <span className="text-gold-400">Endless Connections.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Discover businesses, professionals, properties, services, and opportunities across the Khoja community—powered by intelligent search.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-5">
            <div className="flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden ring-4 ring-white/20">
              <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Try: Find a photographer in Mumbai or a CA who helps with GST..."
                className="flex-1 px-4 py-4 text-gray-800 bg-transparent outline-none text-sm placeholder:text-gray-400"
              />
              <div className="flex items-center gap-1 mr-1.5">
                <button className="p-2.5 text-gray-400 hover:text-brand-700 transition-colors rounded-xl">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSearch()}
                  className="flex items-center gap-1.5 bg-brand-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-gold-300" />
                  Search
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-white/50 text-xs justify-center">
              <Sparkles className="w-3 h-3" />
              <span>AI-powered · Results from KhojaSphere community listings</span>
            </div>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {queryChips.map(q => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                className="px-4 py-2 bg-white/10 text-white/80 text-xs md:text-sm rounded-full hover:bg-white/20 transition-all border border-white/15 backdrop-blur-sm"
              >
                {q}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('search')}
              className="px-8 py-3.5 bg-gold-500 text-white font-semibold rounded-xl hover:bg-gold-600 transition-colors shadow-lg shadow-gold-500/30 text-sm"
            >
              Explore KhojaSphere
            </button>
            <button
              onClick={() => navigate('ai-listing')}
              className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/25 backdrop-blur-sm text-sm"
            >
              List Your Business
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-brand-900 py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Community Businesses', value: '1,200+', note: 'demo data' },
            { label: 'Properties Listed', value: '850+', note: 'sample' },
            { label: 'Marketplace Items', value: '2,400+', note: 'sample' },
            { label: 'Cities Covered', value: '18+', note: 'sample' },
          ].map(s => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-white">{s.value}</div>
              <div className="text-brand-300 text-sm mt-1">{s.label}</div>
              <div className="text-brand-500 text-xs mt-0.5">[{s.note}]</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-bold text-brand-900 mb-3">Browse by Category</h2>
            <p className="text-gray-500 text-lg">Find exactly what you need across our growing community.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map(({ icon: Icon, label, count }) => (
              <button
                key={label}
                onClick={() => navigate('search', { category: label })}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all group text-center"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <Icon className="w-5 h-5 text-brand-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm leading-tight">{label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{count}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Academic Mentorship ── */}
      <section className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-8 md:p-12 lg:p-14">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
                  <GraduationCap className="h-4 w-4" />
                  Academic guidance
                </div>
                <h2 className="mt-6 font-display text-4xl font-bold leading-tight text-brand-950">
                  Learn with someone who has walked the path.
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-500">
                  Connect with community mentors for course selection, admissions, career direction, and practical study support.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    { icon: Users, label: 'Find a mentor' },
                    { icon: Target, label: 'Set a goal' },
                    { icon: Calendar, label: 'Plan guidance' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-sm font-medium text-brand-800">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('mentorship')}
                  className="mt-9 inline-flex items-center gap-2 rounded-xl bg-brand-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Explore mentorship
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="relative min-h-80 bg-brand-900">
                <img
                  src="https://images.unsplash.com/photo-1734344642680-d0f8d4c13c44?auto=format&fit=crop&w=1200&q=85"
                  alt="Graduate representing academic mentorship"
                  className="absolute inset-0 h-full w-full object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-900/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">New in KhojaSphere</p>
                  <p className="mt-2 font-display text-xl font-semibold">Mentor-led, goal-focused guidance for every learning stage.</p>
                  <p className="mt-2 text-xs text-white/60">Concept preview · Mentor profiles are sample data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Discovery ── */}
      <section className="py-20 bg-brand-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold-500/15 text-gold-400 text-sm px-3 py-1.5 rounded-full mb-6 border border-gold-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Intelligent Discovery
              </div>
              <h2 className="font-display text-4xl font-bold text-white mb-5 leading-tight">Search the way you think.</h2>
              <p className="text-white/65 text-lg mb-8 leading-relaxed">
                KhojaSphere AI understands natural-language requests and helps you discover relevant community businesses, services, properties, and listings.
              </p>
              <button
                onClick={() => navigate('ai-assistant')}
                className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-white rounded-xl font-semibold hover:bg-gold-600 transition-colors text-sm"
              >
                Try AI Search
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Chat card */}
            <div className="bg-brand-900 rounded-2xl border border-brand-700/60 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-700/60">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">KhojaSphere AI</div>
                  <div className="text-brand-400 text-xs">Powered by Ollama · Results from community listings</div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {aiConversation.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'gap-2.5'}`}>
                    {m.role === 'ai' && (
                      <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm max-w-[80%] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-brand-600 text-white rounded-br-sm'
                          : 'bg-brand-800 text-white/80 rounded-tl-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {/* Filters */}
                <div className="flex flex-wrap gap-2 pl-8">
                  {aiFilters.map(f => (
                    <span key={f} className="text-xs px-3 py-1 rounded-full bg-brand-700/60 text-brand-300 border border-brand-600/40">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Mini business card */}
                <div
                  className="ml-8 bg-brand-800/50 rounded-xl p-3 flex gap-3 items-center border border-brand-700/40 cursor-pointer hover:bg-brand-800 transition-colors"
                  onClick={() => navigate('business')}
                >
                  <img
                    src="https://images.unsplash.com/photo-1542038374657-6b562f3e9c3c?w=60&h=60&fit=crop&auto=format"
                    alt="Demo Photography Studio"
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-brand-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">Demo Photography Studio</div>
                    <div className="text-brand-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Bandra West, Mumbai
                    </div>
                    <div className="text-xs text-brand-400 mt-0.5">[Sample listing]</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display text-4xl font-bold text-brand-900 mb-2">Featured Listings</h2>
              <p className="text-gray-500">Sample community businesses and services.</p>
            </div>
            <button
              onClick={() => navigate('search')}
              className="hidden md:flex items-center gap-1.5 text-brand-700 font-medium text-sm hover:text-brand-500 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {businesses.map(b => (
              <div key={b.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <div className="relative h-44 bg-gray-100">
                  <img src={b.image} alt={b.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => toggleSave(b.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                  >
                    <Heart className={`w-4 h-4 ${saved.includes(b.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                  <span className="absolute top-3 left-3 text-xs px-2 py-1 rounded-full bg-white/90 text-gray-600">
                    {b.status}
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-xs text-brand-600 font-medium mb-1">{b.category}</div>
                  <h3 className="font-display font-semibold text-gray-800 text-base mb-1">{b.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{b.shortDesc}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    {b.location}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {b.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('business', { id: b.id })}
                      className="flex-1 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
                    >
                      View Details
                    </button>
                    <button className="flex-1 py-2 text-xs font-medium text-white bg-brand-800 rounded-xl hover:bg-brand-700 transition-colors">
                      Inquire
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-brand-900 mb-3">How KhojaSphere works</h2>
            <p className="text-gray-500 text-lg">From search to connection in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(s => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4 border border-brand-100">
                  <span className="font-display font-bold text-brand-700 text-sm">{s.n}</span>
                </div>
                <h3 className="font-display font-semibold text-gray-800 text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 bg-gradient-to-r from-brand-900 to-brand-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to list your business?</h2>
          <p className="text-white/70 mb-8">Use our AI assistant to generate a polished listing in minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('ai-listing')}
              className="px-8 py-3.5 bg-gold-500 text-white font-semibold rounded-xl hover:bg-gold-600 transition-colors text-sm"
            >
              Create Listing with AI
            </button>
            <button
              onClick={() => navigate('auth-register')}
              className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/25 text-sm"
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-brand-950 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs font-display">K</span>
            </div>
            <span className="font-display font-bold text-white">Khoja<span className="text-brand-400">Sphere</span></span>
          </div>
          <p className="text-brand-500 text-xs">Demo prototype · Hackathon build · Not a live product</p>
          <div className="flex gap-5 text-brand-500 text-xs">
            <button className="hover:text-brand-300 transition-colors">About</button>
            <button className="hover:text-brand-300 transition-colors">Privacy</button>
            <button className="hover:text-brand-300 transition-colors">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
