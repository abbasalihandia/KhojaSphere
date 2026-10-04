import { useCallback, useEffect, useState } from 'react';
import type { PageKey, NavigateFn } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { OneIdProvider } from './context/OneIdContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import BusinessProfile from './pages/BusinessProfile';
import Properties from './pages/Properties';
import Marketplace from './pages/Marketplace';
import Mentorship from './pages/Mentorship';
import AIListing from './pages/AIListing';
import AIAssistant from './pages/AIAssistant';
import Saved from './pages/Saved';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Auth from './pages/Auth';

const PAGES: PageKey[] = ['home', 'search', 'business', 'properties', 'marketplace', 'mentorship', 'ai-listing', 'ai-assistant',
  'saved', 'dashboard', 'admin', 'auth-signin', 'auth-register', 'auth-reset'];
const NEEDS_LOGIN: PageKey[] = ['saved', 'dashboard', 'ai-listing', 'admin'];

type Route = { page: PageKey; params: Record<string, unknown> };

// URLs look like  #/search?query=photographer&category=Healthcare  so refresh, back and shared links work.
function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const page = (PAGES as string[]).includes(path) ? (path as PageKey) : 'home';
  const params: Record<string, unknown> = {};
  new URLSearchParams(query).forEach((v, k) => { params[k] = /id$/i.test(k) && /^\d+$/.test(v) ? Number(v) : v; });
  return { page, params };
}

function buildHash(page: PageKey, params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      if (v !== '') q.set(k, String(v));
    }
  }
  const s = q.toString();
  return `#/${page}${s ? `?${s}` : ''}`;
}

function Shell() {
  const { user, ready } = useAuth();
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const navigate: NavigateFn = useCallback((page, params = {}) => {
    const hash = buildHash(page, params);
    if (window.location.hash === hash) setRoute({ page, params });
    else window.location.hash = hash; // triggers hashchange
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { page, params } = route;
  const pageProps = { navigate, params };

  const renderPage = () => {
    if (NEEDS_LOGIN.includes(page) || page === 'admin') {
      if (!ready) {
        return <div className="pt-32 text-center text-gray-500 text-sm" role="status">Loading…</div>;
      }
      if (!user) {
        return <Auth navigate={navigate} params={{ mode: 'signin', redirect: { page, params }, notice: 'Please sign in to continue.' }} />;
      }
      if (page === 'admin' && user.role !== 'admin') {
        return (
          <div className="pt-32 max-w-md mx-auto text-center px-6">
            <h1 className="font-display font-bold text-2xl text-brand-950 mb-2">Admin access only</h1>
            <p className="text-gray-500 text-sm mb-5">Your account doesn't have permission to open the admin dashboard.</p>
            <button onClick={() => navigate('home')} className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700">Back to home</button>
          </div>
        );
      }
    }
    switch (page) {
      case 'search': return <Search key={JSON.stringify(params)} {...pageProps} />;
      case 'business': return <BusinessProfile key={String(params.id)} {...pageProps} />;
      case 'properties': return <Properties {...pageProps} />;
      case 'marketplace': return <Marketplace {...pageProps} />;
      case 'mentorship': return <Mentorship {...pageProps} />;
      case 'ai-listing': return <AIListing key={JSON.stringify(params)} {...pageProps} />;
      case 'ai-assistant': return <AIAssistant {...pageProps} />;
      case 'saved': return <Saved {...pageProps} />;
      case 'dashboard': return <Dashboard {...pageProps} />;
      case 'admin': return <Admin {...pageProps} />;
      case 'auth-signin': return <Auth {...pageProps} params={{ ...params, mode: 'signin' }} />;
      case 'auth-register': return <Auth {...pageProps} params={{ ...params, mode: 'register' }} />;
      case 'auth-reset': return <Auth {...pageProps} params={{ ...params, mode: 'reset' }} />;
      default: return <Home {...pageProps} />;
    }
  };

  // AI Assistant is full-height, so no extra wrapper needed
  const isFullHeight = page === 'ai-assistant';

  return (
    <div className={`min-h-screen bg-surface font-sans ${isFullHeight ? 'h-screen overflow-hidden' : ''}`}>
      <Navbar currentPage={page} navigate={navigate} />
      {renderPage()}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OneIdProvider>
        <FavoritesProvider>
          <Shell />
        </FavoritesProvider>
      </OneIdProvider>
    </AuthProvider>
  );
}
