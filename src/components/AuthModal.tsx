import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else {
        await signUp(email, password);
        setInfo('Account created. Check your email to confirm, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-ink-800 rounded-2xl shadow-2xl border border-ink-100 dark:border-ink-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-lg text-ink-900 dark:text-white">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-sm text-ink-800 dark:text-ink-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-sm text-ink-800 dark:text-ink-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
          />

          {error && <p className="text-sm text-danger-600">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {mode === 'signin' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
          className="mt-4 text-xs text-ink-500 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-400 underline underline-offset-2"
        >
          {mode === 'signin' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
