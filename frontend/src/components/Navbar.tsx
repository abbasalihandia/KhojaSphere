import { useState } from 'react';
import { Search, Menu, X, Sparkles, Heart, User, Building2, GraduationCap } from 'lucide-react';
import type { NavigateFn, PageKey } from '../types';
import { useAuth } from '../context/AuthContext';
import { useOneId } from '../context/OneIdContext';
import { isVerifiedState } from '../api/oneId';
import OneIdBadge from './OneIdBadge';

interface NavbarProps {
  currentPage: PageKey;
  navigate: NavigateFn;
}

const navLinks: { label: string; page: PageKey }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Explore', page: 'search' },
  { label: 'Properties', page: 'properties' },
  { label: 'Marketplace', page: 'marketplace' },
  { label: 'Mentorship', page: 'mentorship' },
  { label: 'AI Assistant', page: 'ai-assistant' },
  { label: 'Saved', page: 'saved' },
];

export default function Navbar({ currentPage, navigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const oneId = useOneId();

  const handleSignOut = async () => {
    await logout();
    setMobileOpen(false);
    navigate('home');
  };

  const handleNav = (page: PageKey) => {
    navigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-800 to-brand-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm font-display">K</span>
              </div>
              <span className="font-display font-bold text-brand-900 text-lg">
                Khoja<span className="text-brand-500">Sphere</span>
              </span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => handleNav(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'text-brand-700 bg-brand-50'
                      : 'text-gray-600 hover:text-brand-700 hover:bg-gray-50'
                  }`}
                >
                  {page === 'ai-assistant' ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                      {label}
                    </span>
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>

            {/* Desktop Right */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => handleNav('ai-listing')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                List Your Business
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleNav('admin')}
                  className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-700 transition-colors"
                >
                  Admin
                </button>
              )}
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => handleNav('auth-signin')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors"
                >
                  Sign In
                </button>
              )}
              <span className="relative inline-flex">
              <button
                onClick={() => handleNav('dashboard')}
                title={user ? user.name : 'Your account'}
                aria-label={user ? `${user.name} – open dashboard` : 'Open dashboard'}
                className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition-colors overflow-hidden"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : user ? (
                  <span className="text-xs font-bold text-brand-700">{user.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="w-4 h-4 text-brand-700" />
                )}
              </button>
              {user && oneId.enabled && oneId.visibility.showBadge && isVerifiedState(oneId.state) && (
                <OneIdBadge state="active" size="icon" className="absolute -bottom-1 -right-1 bg-white pointer-events-none" />
              )}
              </span>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => handleNav(page)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'text-brand-700 bg-brand-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                <button
                  onClick={() => handleNav('ai-listing')}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors"
                >
                  List Your Business
                </button>
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Sign Out ({user.name.split(' ')[0]})
                  </button>
                ) : (
                  <button
                    onClick={() => handleNav('auth-signin')}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Sign In
                  </button>
                )}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleNav('admin')}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Admin Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 flex items-stretch">
        {[
          { icon: Search, label: 'Explore', page: 'home' as PageKey },
          { icon: Search, label: 'Search', page: 'search' as PageKey },
          { icon: GraduationCap, label: 'Mentors', page: 'mentorship' as PageKey },
          { icon: Heart, label: 'Saved', page: 'saved' as PageKey },
          { icon: User, label: 'Profile', page: 'dashboard' as PageKey },
        ].map(({ icon: Icon, label, page }) => (
          <button
            key={page}
            onClick={() => handleNav(page)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
              currentPage === page ? 'text-brand-700' : 'text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
