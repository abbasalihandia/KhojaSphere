import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, MapPin, ChevronRight, Mic, RotateCcw } from 'lucide-react';
import type { PageProps } from '../types';
import { ai, errorMessage, type SearchItem } from '../api';
import ListingDetailModal from '../components/ListingDetailModal';
import SafeImage from '../components/SafeImage';
import { aiBadge, useAIStatus } from '../hooks/useAIStatus';
import { useSpeech } from '../hooks/useSpeech';

type Role = 'user' | 'ai';
interface Message {
  id: number;
  role: Role;
  text: string;
  results?: SearchItem[];
  filters?: string[];
  action?: string | null;
  error?: boolean;
}

const suggestedPrompts = [
  'Find photographers near me',
  'Find accountants in Mumbai',
  'Find rental properties within my budget',
  'Help me create a business listing',
  'What event planners are available in Juhu?',
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'ai',
    text: "Hello! I'm the KhojaSphere AI assistant. I can help you discover community businesses, professionals, properties, and marketplace listings. What are you looking for today?",
  },
];

export default function AIAssistant({ navigate }: PageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SearchItem | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const status = useAIStatus();
  const speech = useSpeech((t) => setInput((cur) => (cur ? `${cur} ${t}` : t)));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const history = messages.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: msg }]);
    setLoading(true);
    try {
      const r = await ai.chat(msg, history);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: r.reply, results: r.results, filters: r.filters, action: r.action }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: `Sorry, I couldn't complete that: ${errorMessage(e)}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const openResult = (b: SearchItem) =>
    b.type === 'business' || b.type === 'professional' ? navigate('business', { id: b.id }) : setDetail(b);

  const reset = () => {
    setMessages(initialMessages);
    setInput('');
  };

  return (
    <div className="pt-16 pb-20 lg:pb-0 h-screen flex flex-col bg-surface">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-800 to-brand-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-gold-300" />
            </div>
            <div>
              <h1 className="font-display font-bold text-brand-900 text-lg">KhojaSphere AI</h1>
              <p className="text-xs text-gray-400">Your intelligent community discovery assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <div className={`w-2 h-2 rounded-full ${status?.provider === 'ollama' ? 'bg-green-400' : 'bg-amber-400'}`} />
              {aiBadge(status)}
            </div>
            <button onClick={reset} aria-label="Start a new conversation" className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'gap-3'}`}>
              {m.role === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-800 to-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                  <Sparkles className="w-4 h-4 text-gold-300" />
                </div>
              )}
              <div className="flex flex-col gap-3 max-w-[80%]">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-brand-800 text-white rounded-br-sm'
                      : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {m.text}
                </div>

                {/* Result cards */}
                {m.results && m.results.map(b => (
                  <div
                    key={`${b.type}-${b.id}`}
                    className="bg-white border border-gray-100 rounded-2xl p-3 flex gap-3 items-center hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer shadow-sm"
                    onClick={() => openResult(b)}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><SafeImage src={b.image} alt={b.name} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-brand-600 font-medium mb-0.5">{b.category}</div>
                      <div className="text-sm font-semibold text-gray-800 truncate">{b.name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {b.location}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{b.priceRange && <span className="text-gray-600 font-medium">{b.priceRange} · </span>}[{b.status}]</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                ))}

                {m.filters && m.filters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs text-gray-400 items-center">
                    <span>Searched:</span>
                    {m.filters.map((f) => <span key={f} className="px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200">{f}</span>)}
                  </div>
                )}

                {/* Listing CTA */}
                {m.role === 'ai' && m.action === 'open_listing_assistant' && (
                  <button
                    onClick={() => navigate('ai-listing')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-white text-sm font-semibold rounded-xl hover:bg-gold-600 transition-colors self-start"
                  >
                    <Sparkles className="w-4 h-4" />
                    Open AI Listing Assistant
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-800 to-brand-500 flex items-center justify-center flex-shrink-0 shadow">
                <Sparkles className="w-4 h-4 text-gold-300" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map(d => (
                    <div
                      key={d}
                      className="w-2 h-2 rounded-full bg-brand-300 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Suggested prompts ── */}
      <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-2 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-gray-400 mb-2">Suggested prompts:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestedPrompts.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                className="flex-shrink-0 text-xs px-3 py-2 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Input ── */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 gap-2 focus-within:ring-2 focus-within:ring-brand-200 focus-within:border-brand-400 transition">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything about community businesses, services, or listings…"
              className="flex-1 bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
            {speech.supported && (
              <button type="button" onClick={speech.toggle} aria-label={speech.listening ? 'Stop voice input' : 'Voice input'} className={`transition-colors p-1 ${speech.listening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-brand-600'}`}>
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => send()}
            aria-label="Send message"
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-brand-800 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Results come from KhojaSphere listings only. AI does not invent information.</p>
      </div>
      {detail && (detail.type === 'property' || detail.type === 'marketplace') && (
        <ListingDetailModal type={detail.type} id={detail.id} onClose={() => setDetail(null)} onSignIn={() => navigate('auth-signin', { next: '#/ai-assistant' })} />
      )}
    </div>
  );
}
