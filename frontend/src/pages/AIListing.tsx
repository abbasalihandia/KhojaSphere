import { useState } from 'react';
import { Sparkles, AlertCircle, Check, Edit3, Send, Save, ChevronRight } from 'lucide-react';
import type { PageProps } from '../types';

type Step = 'input' | 'generating' | 'review' | 'published';

const generatedDraft = {
  title: 'Wedding Photography & Videography Services in Mumbai',
  description: `We are a Mumbai-based photography and videography team specialising in weddings and events. With a story-driven, cinematic approach, we capture the moments that matter most — from the first glance to the final dance.

Our packages are tailored to suit every couple's vision and budget, covering wedding photography, videography, pre-wedding shoots, and full event coverage across Mumbai, Pune, and beyond.

[AI-generated draft — please review and edit before publishing. Ensure all information is accurate and up to date.]`,
  category: 'Photography & Videography',
  tags: ['Wedding Photography', 'Videography', 'Events', 'Mumbai', 'Pre-Wedding'],
  missing: ['Service pricing', 'Availability', 'Contact preference', 'Business address'],
};

export default function AIListing({ navigate }: PageProps) {
  const [step, setStep] = useState<Step>('input');
  const [userInput, setUserInput] = useState('');
  const [title, setTitle] = useState(generatedDraft.title);
  const [description, setDescription] = useState(generatedDraft.description);
  const [category, setCategory] = useState(generatedDraft.category);
  const [tags, setTags] = useState(generatedDraft.tags);

  const handleGenerate = () => {
    if (!userInput.trim()) return;
    setStep('generating');
    setTimeout(() => setStep('review'), 2000);
  };

  const handlePublish = () => setStep('published');

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm px-4 py-2 rounded-full mb-4 border border-brand-100">
            <Sparkles className="w-4 h-4 text-gold-500" />
            AI-Assisted Listing
          </div>
          <h1 className="font-display text-4xl font-bold text-brand-900 mb-3">Create your listing with AI</h1>
          <p className="text-gray-500 text-lg">Describe what you do and let AI generate a polished draft. You review and edit before publishing.</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['input', 'review', 'published'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s || (step === 'generating' && s === 'review')
                  ? 'bg-brand-800 text-white'
                  : step === 'published' && s !== 'published'
                  ? 'bg-green-500 text-white'
                  : s === 'published' && step !== 'published'
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {(step === 'published' && s !== 'published') ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-gray-500 hidden sm:block capitalize">{s}</span>
              {i < 2 && <div className={`flex-1 h-px ${step !== 'input' && i === 0 ? 'bg-brand-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Input ── */}
        {(step === 'input' || step === 'generating') && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-display font-bold text-brand-900 text-xl mb-2">Tell us about your business</h2>
            <p className="text-gray-500 text-sm mb-5">Write naturally — no need for perfect formatting. AI will structure it for you.</p>
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="I do photography and video for weddings and events in Mumbai. I've been doing this for 5 years and specialise in cinematic wedding films..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition resize-none placeholder:text-gray-400"
            />

            {/* Example prompts */}
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-400 mb-2">Example prompts:</p>
              {[
                'I do photography and video for weddings and events in Mumbai.',
                'I am a CA in Fort, Mumbai. I help with GST, ITR, and company audits.',
                'I run a catering business in Andheri for weddings and corporate events.',
              ].map(ex => (
                <button
                  key={ex}
                  onClick={() => setUserInput(ex)}
                  className="w-full text-left text-xs text-brand-600 px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 transition-colors"
                >
                  "{ex}"
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!userInput.trim() || step === 'generating'}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {step === 'generating' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating draft…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold-300" />
                  Generate Draft with AI
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">AI drafts are generated from KhojaSphere's listing templates. Always review before publishing.</p>
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* AI review banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-semibold text-sm">Review required before publishing</p>
                <p className="text-amber-700 text-xs mt-0.5">AI-generated content may contain inaccuracies. Edit each field to ensure accuracy before making this listing public.</p>
              </div>
            </div>

            {/* Title */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Suggested
                </div>
                <span className="text-sm font-semibold text-gray-700">Listing Title</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition font-medium"
              />
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Suggested
                </div>
                <span className="text-sm font-semibold text-gray-700">Description</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition resize-none"
              />
            </div>

            {/* Category */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Suggested
                </div>
                <span className="text-sm font-semibold text-gray-700">Category</span>
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition bg-white cursor-pointer"
              >
                <option>Photography & Videography</option>
                <option>Accountants & CAs</option>
                <option>Event Services</option>
                <option>Legal Services</option>
                <option>Healthcare</option>
                <option>IT Services</option>
              </select>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Suggested
                </div>
                <span className="text-sm font-semibold text-gray-700">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs border border-brand-200">
                    {t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-brand-400 hover:text-brand-600 transition-colors">×</button>
                  </span>
                ))}
                <button className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors">
                  + Add tag
                </button>
              </div>
            </div>

            {/* Missing info */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Missing Information
              </h3>
              <ul className="space-y-1.5">
                {generatedDraft.missing.map(m => (
                  <li key={m} className="flex items-center gap-2 text-sm text-red-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-800 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors">
                <Edit3 className="w-4 h-4" />
                Continue Editing
              </button>
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-3 bg-gold-500 text-white text-sm font-semibold rounded-xl hover:bg-gold-600 transition-colors"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Published ── */}
        {step === 'published' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-3">Listing Submitted!</h2>
            <p className="text-gray-500 text-sm mb-2">Your listing has been submitted for review. It will appear on KhojaSphere once approved.</p>
            <p className="text-xs text-gray-400 mb-8">[Demo: in a real flow, a community moderator reviews listings before publishing.]</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('dashboard')}
                className="px-6 py-3 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors text-sm"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => { setStep('input'); setUserInput(''); }}
                className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
