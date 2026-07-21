import { useState } from 'react';
import { ListTree, Sparkles, Map as MapIcon, Moon, Sun, LogIn, LogOut, User } from 'lucide-react';
import ListingsPage from './pages/ListingsPage';
import InsightsPage from './pages/InsightsPage';
import MapPage from './pages/MapPage';
import { useProperties } from './hooks/useProperties';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { PageTransition } from './components/PageTransition';
import { AuthModal } from './components/AuthModal';

type TabId = 'listings' | 'insights' | 'map';

const TABS: { id: TabId; label: string; icon: typeof ListTree }[] = [
  { id: 'listings', label: 'Listings', icon: ListTree },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'map', label: 'Map', icon: MapIcon },
];

function App() {
  const [tab, setTab] = useState<TabId>('listings');
  const { properties, loading, error, refetch } = useProperties();
  const { theme, toggle } = useTheme();
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();
  console.log('DEBUG auth:', { email: user?.email, isAdmin, app_metadata: user?.app_metadata });
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 dark:bg-ink-900/85 border-b border-ink-100 dark:border-ink-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
  <img
    src="/Untitled_Project_-_illustrationImage_(2).png"
    alt="LandLogic logo"
    className="h-11 w-11 object-contain ring-1 ring-ink-100 dark:ring-ink-700 shadow-sm"
  />
              <div className="leading-tight">
                <div className="font-display font-extrabold text-ink-900 dark:text-white text-lg tracking-tight">
                  Land<span className="text-teal-600 dark:text-teal-400">Logic</span>
                </div>
                {/* <div className="text-[11px] text-ink-400 dark:text-ink-400 font-medium tracking-wide uppercase">
                 
                </div> */}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1 bg-ink-50 dark:bg-ink-800 rounded-xl p-1 border border-ink-100 dark:border-ink-700">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={[
                        'flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                        active
                          ? 'bg-white dark:bg-ink-700 text-brand-700 dark:text-brand-300 shadow-sm ring-1 ring-ink-100 dark:ring-ink-600'
                          : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white hover:bg-white/60 dark:hover:bg-ink-700/50',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </nav>

              <button
                onClick={toggle}
                aria-label="Toggle dark mode"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="h-10 w-10 grid place-items-center rounded-xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700 text-ink-600 dark:text-amber-300 hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors duration-200"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" strokeWidth={2.2} /> : <Moon className="h-5 w-5" strokeWidth={2.2} />}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 dark:text-ink-400">
                    <User className="h-3.5 w-3.5" /> {user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    title="Sign out"
                    className="h-10 w-10 grid place-items-center rounded-xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors duration-200"
                  >
                    <LogOut className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700 text-sm font-semibold transition-colors duration-200"
                >
                  <LogIn className="h-4 w-4" strokeWidth={2.2} />
                  <span className="hidden sm:inline">Sign in</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="rounded-xl border border-danger-500/40 bg-danger-500/5 p-6 text-danger-600 dark:text-danger-500">
            <p className="font-semibold">Couldn't load property data.</p>
            <p className="text-sm mt-1 text-ink-600 dark:text-ink-300">{error}</p>
          </div>
        ) : (
          <PageTransition pageKey={tab}>
            {tab === 'listings' ? (
             <ListingsPage
  properties={properties}
  loading={loading}
  onChanged={refetch}
/>
            ) : tab === 'insights' ? (
              <InsightsPage properties={properties} loading={loading} />
            ) : (
              <MapPage properties={properties} loading={loading} />
            )}
          </PageTransition>
        )}
      </main>

      <footer className="border-t border-ink-100 dark:border-ink-700 bg-white/60 dark:bg-ink-900/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-ink-400 dark:text-ink-400 flex flex-wrap items-center justify-between gap-2">
          <span></span>
          <span className="font-mono">LandLogic</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
