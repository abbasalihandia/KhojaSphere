import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import type { PageProps } from '../types';
import { mentors as mentorApi, errorMessage, type Mentor } from '../api';
import { useAuth } from '../context/AuthContext';
import { OwnerBadge } from '../components/OneIdBadge';
import { useDebounce } from '../hooks/useDebounce';

const pathways = [
  { icon: GraduationCap, title: 'Admissions & scholarships', copy: 'Shortlist programmes, strengthen applications, and plan important deadlines.' },
  { icon: BookOpen, title: 'Study & exam support', copy: 'Build realistic study routines with accountability from an experienced guide.' },
  { icon: BriefcaseBusiness, title: 'Career direction', copy: 'Connect academic choices to skills, internships, and early career decisions.' },
];

export default function Mentorship({ navigate }: PageProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 350);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    mentorApi.list(debounced || undefined)
      .then((r) => alive && setMentors(r.items))
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [debounced, user?.id, retry]);

  const filteredMentors = mentors;

  const requestGuidance = async (id: number) => {
    if (!user) { navigate('auth-signin', { next: '#/mentorship' }); return; }
    setPending(id);
    setRequestError(null);
    try {
      await mentorApi.request(id);
      setMentors((cur) => cur.map((m) => (m.id === id ? { ...m, requested: true } : m)));
    } catch (e) {
      setRequestError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-24 pt-16 lg:pb-0">
      <section className="relative overflow-hidden bg-brand-950">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_0.72fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80">
                <Sparkles className="h-4 w-4 text-gold-300" />
                Academic Mentorship
              </div>
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-white md:text-6xl">
                Guidance for the next step in your learning journey.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">
                Discover community members willing to guide students through studies, admissions, scholarships, and early career choices.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400 text-brand-950">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display font-semibold text-white">Start with your goal</p>
                  <p className="text-sm text-white/55">A mentor request takes less than two minutes.</p>
                </div>
              </div>
              <button
                onClick={() => document.getElementById('find-a-mentor')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-300"
              >
                Find a mentor
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">How mentors can help</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-brand-950 md:text-4xl">Support built around real academic goals</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pathways.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-brand-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="find-a-mentor" className="border-y border-brand-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Community guides</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-brand-950">Find your mentor</h2>
              <p className="mt-2 text-sm text-gray-500">Profiles marked “Sample mentor profile” are demonstration data. Community mentors appear once reviewed.</p>
            </div>
            <label className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-surface px-4 py-3 focus-within:border-brand-400 md:max-w-sm">
              <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by subject or goal"
                className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
            </label>
          </div>

          {(error || requestError) && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between" role="alert">
              <span>{error || requestError}</span>
              {error && <button onClick={() => setRetry((n) => n + 1)} className="underline font-medium">Try again</button>}
            </div>
          )}
          {loading && <p className="mt-9 text-center text-sm text-gray-400" role="status">Loading mentors…</p>}

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {filteredMentors.map(mentor => {
              const isRequested = mentor.requested;
              return (
                <article key={mentor.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative h-52 bg-brand-100">
                    {mentor.image ? <img src={mentor.image} alt="" className="h-full w-full object-cover object-top" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 font-display text-5xl font-bold text-brand-600">{mentor.name.charAt(0)}</div>}
                    {mentor.isSample && <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-xs font-medium text-brand-800 backdrop-blur-sm">
                      Sample mentor profile
                    </span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{mentor.role}</p>
                    <h3 className="mt-1 font-display text-xl font-bold text-brand-950">{mentor.name}</h3>
                    <OwnerBadge item={mentor} kind="mentor" className="mt-2" />
                    <p className="mt-1 text-sm text-gray-500">{mentor.education}</p>

                    {/* ▼ NEW FEATURE GOES HERE (right below education), e.g. languages or years of experience */}

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {mentor.expertise.map(item => (
                        <span key={item} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700">{item}</span>
                      ))}
                    </div>
                    <div className="mt-5 mb-5 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                      <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-brand-500" />{mentor.format}</div>
                      <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-brand-500" />{mentor.availability}</div>
                    </div>
                    <button
                      onClick={() => requestGuidance(mentor.id)}
                      disabled={isRequested || pending === mentor.id || mentor.isOwner}
                      className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isRequested
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-brand-800 text-white hover:bg-brand-700'
                      }`}
                    >
                      {mentor.isOwner ? 'Your profile' : isRequested ? <><Check className="h-4 w-4" />Request sent</> : pending === mentor.id ? 'Sending…' : <>Request guidance<ChevronRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {!loading && !error && filteredMentors.length === 0 && (
            <div className="mt-9 rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-brand-300" />
              <h3 className="mt-3 font-display font-semibold text-brand-900">No mentors match that search</h3>
              <p className="mt-1 text-sm text-brand-600">Try a broader subject such as admissions, engineering, or study plans.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 rounded-3xl bg-brand-900 p-7 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gold-300">
              <Calendar className="h-4 w-4" />
              Become a community mentor
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">Share experience that can change someone’s direction.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">Create a mentor account and complete your profile. No availability or credentials are published without review.</p>
          </div>
          <button
            onClick={() => navigate('auth-register', { role: 'mentor' })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:bg-gold-50"
          >
            Become a mentor
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
